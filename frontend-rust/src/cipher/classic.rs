use std::cell::{Cell, RefCell};
use std::collections::{HashMap, HashSet};

use js_sys::{Array, Function, Object, Promise, Reflect, Uint8Array};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{future_to_promise, spawn_local, JsFuture};
use web_sys::{
    console, CanvasRenderingContext2d, Document, Element, Event, HtmlCanvasElement, HtmlElement,
    MouseEvent, Window,
};

const CCC_TABLE_JS: &str = include_str!("data/chinese_code_table.js");
const FOUR_CCC_TABLE_JS: &str = include_str!("data/corner_map.js");

const MORSE_DICT: &[(char, &str)] = &[
    ('A', ".-"),
    ('B', "-..."),
    ('C', "-.-."),
    ('D', "-.."),
    ('E', "."),
    ('F', "..-."),
    ('G', "--."),
    ('H', "...."),
    ('I', ".."),
    ('J', ".---"),
    ('K', "-.-"),
    ('L', ".-.."),
    ('M', "--"),
    ('N', "-."),
    ('O', "---"),
    ('P', ".--."),
    ('Q', "--.-"),
    ('R', ".-."),
    ('S', "..."),
    ('T', "-"),
    ('U', "..-"),
    ('V', "...-"),
    ('W', ".--"),
    ('X', "-..-"),
    ('Y', "-.--"),
    ('Z', "--.."),
    ('1', ".----"),
    ('2', "..---"),
    ('3', "...--"),
    ('4', "....-"),
    ('5', "....."),
    ('6', "-...."),
    ('7', "--..."),
    ('8', "---.."),
    ('9', "----."),
    ('0', "-----"),
    ('.', ".-.-.-"),
    (',', "--..--"),
    ('?', "..--.."),
    ('\'', ".----."),
    ('!', "-.-.--"),
    ('/', "-..-."),
    ('(', "-.--."),
    (')', "-.--.-"),
    ('&', ".-..."),
    (':', "---..."),
    (';', "-.-.-."),
    ('=', "-...-"),
    ('+', ".-.-."),
    ('-', "-....-"),
    ('_', "..--.-"),
    ('"', ".-..-."),
    ('$', "...-..-"),
    ('@', ".--.-."),
    (' ', "/"),
];

const PIGPEN_LETTERS: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PIGPEN_SYMBOLS: [&str; 26] = [
    "⌜", "⊓", "⌝", "⊏", "□", "⊐", "⌞", "⊔", "⌟", "⌜·", "⊓·", "⌝·", "⊏·", "□·",
    "⊐·", "⌞·", "⊔·", "⌟·", "◇⌜", "◇⊓", "◇⌝", "◇⊏", "◇⌞", "◇⊔", "◇⌟", "◇□",
];
const DANCING_SYMBOLS: [&str; 26] = [
    "○╱│╲", "╲○│╱", "○─│╲", "╱○│─", "○╱│─", "─○│╲", "○─│╱", "╲○│─", "○╱╲",
    "╲○╱", "○┌│", "┐○│", "○│┘", "└│○", "○┬│", "┴○│", "○╱┘", "└○╲", "○─┘",
    "└─○", "○╲┐", "┌╱○", "○┤╱", "╲├○", "○┬╲", "╱┴○",
];

const SEMAPHORE_BITS_TO_CHAR: &str = "   W J#  YU T    RQ P   O        ML K   I       H                FE D   C       B               A                                ZX V           S               N                               G                                                               ";
const BRAILLE_BITS_TO_CHAR: &str = " A C BIF E D HJG K M LSP O N RTQ              W  U X V   Z Y     ";

thread_local! {
    static UPDATE_PENDING: Cell<bool> = const { Cell::new(false) };
    static CAESAR_SHOW_ALL: Cell<bool> = const { Cell::new(false) };
    static QIYU_BITS: RefCell<Vec<u32>> = RefCell::new(vec![0]);
    static QIYU_ACTIVE: Cell<usize> = const { Cell::new(0) };
    static CCC_MAPS: RefCell<Option<CodeMaps>> = const { RefCell::new(None) };
    static FOUR_CCC_MAPS: RefCell<Option<CodeMaps>> = const { RefCell::new(None) };
    static MODERN_HASH_SEQUENCE: Cell<u32> = const { Cell::new(0) };
}

#[derive(Default)]
struct CodeMaps {
    code_to_char: HashMap<i32, String>,
    char_to_code: HashMap<String, i32>,
}

pub fn init() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(document.as_ref(), &JsValue::from_str("__rustClassicCipherReady"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustClassicCipherReady"),
        &JsValue::TRUE,
    )?;

    install_globals()?;
    bind_input_sync()?;
    bind_update_events()?;
    init_symbol_cipher_panel()?;
    init_qiyu_panel()?;
    init_enigma_ui()?;
    schedule_update_all();
    Ok(())
}

fn install_globals() -> Result<(), JsValue> {
    let win = window()?;

    let schedule = Closure::<dyn FnMut()>::wrap(Box::new(schedule_update_all));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("scheduleUpdateAll"),
        schedule.as_ref(),
    )?;
    schedule.forget();

    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("caesarShowAll"),
        &JsValue::FALSE,
    )?;
    let toggle = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        let show = CAESAR_SHOW_ALL.with(|flag| {
            let next = !flag.get();
            flag.set(next);
            next
        });
        if let Ok(win) = window() {
            let _ = Reflect::set(
                win.as_ref(),
                &JsValue::from_str("caesarShowAll"),
                &JsValue::from_bool(show),
            );
        }
        if let Ok(document) = document() {
            if let Some(btn) = document.get_element_by_id("caesarBruteBtn") {
                let _ = btn.class_list().toggle_with_force("active", show);
            }
        }
        schedule_update_all();
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("toggleCaesarBruteforce"),
        toggle.as_ref(),
    )?;
    toggle.forget();

    let update_enigma = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = update_enigma_layout() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("updateEnigmaLayout"),
        update_enigma.as_ref(),
    )?;
    update_enigma.forget();

    let process_enigma = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        process_enigma();
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("processEnigma"),
        process_enigma.as_ref(),
    )?;
    process_enigma.forget();

    install_legacy_cipher_globals(&win)?;
    Ok(())
}

fn install_legacy_cipher_globals(win: &Window) -> Result<(), JsValue> {
    let dispatcher = Closure::<dyn FnMut(JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |op: JsValue, args: JsValue| {
            let op = js_value_to_string(op);
            let args = if Array::is_array(&args) {
                Array::from(&args)
            } else {
                Array::new()
            };
            JsValue::from_str(&cipher_dispatch(&op, &args))
        },
    ));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("__rustCipherCall"),
        dispatcher.as_ref(),
    )?;
    dispatcher.forget();

    let hash = Closure::<dyn FnMut(JsValue, JsValue, JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |algorithm: JsValue, kind: JsValue, input: JsValue, key: JsValue| {
            let algorithm = js_value_to_string(algorithm);
            let kind = js_value_to_string(kind);
            let input = js_value_to_string(input);
            let key = js_value_to_string(key);
            future_to_promise(async move {
                let output = if kind == "hmac" {
                    web_crypto_hmac_hex(&algorithm, &sha_key_bytes(&key), input.as_bytes())
                        .await
                        .unwrap_or_else(|err| err)
                } else {
                    web_crypto_digest_hex(&algorithm, input.as_bytes())
                        .await
                        .unwrap_or_else(|err| err)
                };
                Ok(JsValue::from_str(&output))
            })
            .into()
        },
    ));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("__rustCipherHash"),
        hash.as_ref(),
    )?;
    hash.forget();

    let enigma = Closure::<dyn FnMut(JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |settings: JsValue, content: JsValue| {
            JsValue::from_str(&enigma_translate_from_js(&settings, &js_value_to_string(content)))
        },
    ));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("__rustCipherEnigma"),
        enigma.as_ref(),
    )?;
    enigma.forget();

    install_qiyu_global_maps(win)?;
    install_enigma_global_models(win)?;
    install_legacy_cipher_js_facade()?;
    Ok(())
}

fn install_legacy_cipher_js_facade() -> Result<(), JsValue> {
    let script = r#"
(function () {
  const call = (name, ...args) => window.__rustCipherCall(name, args);
  const hash = (algorithm, kind, input, key) => window.__rustCipherHash(algorithm, kind, input, key || '');

  window.Caesar = { e: (t, s) => call('caesar.e', t, s), d: (t, s) => call('caesar.d', t, s), brute: t => call('caesar.brute', t) };
  window.Vigenere = {
    e: (t, k) => call('vigenere.e', t, k), d: (t, k) => call('vigenere.d', t, k),
    process: (t, k, v) => call('vigenere.process', t, k, v),
    beaufort: (t, k) => call('vigenere.beaufort', t, k),
    variantBeaufortE: (t, k) => call('vigenere.variantE', t, k),
    variantBeaufortD: (t, k) => call('vigenere.variantD', t, k),
    autokeyE: (t, k) => call('vigenere.autokeyE', t, k),
    autokeyD: (t, k) => call('vigenere.autokeyD', t, k),
    gronsfeldE: (t, k) => call('vigenere.gronsfeldE', t, k),
    gronsfeldD: (t, k) => call('vigenere.gronsfeldD', t, k),
    porta: (t, k) => call('vigenere.porta', t, k)
  };
  window.RailFence = { e: (t, r) => call('rail.e', t, r), d: (t, r) => call('rail.d', t, r) };
  window.TranspositionVariants = {
    process: (t, count, key, variant) => call('trans.process', t, count, key, variant),
    routeE: (t, cols) => call('trans.routeE', t, cols), routeD: (t, cols) => call('trans.routeD', t, cols),
    scytaleE: (t, cols) => call('trans.scytaleE', t, cols), scytaleD: (t, cols) => call('trans.scytaleD', t, cols),
    amscoE: (t, key, cols) => call('trans.amscoE', t, key, cols), amscoD: (t, key, cols) => call('trans.amscoD', t, key, cols),
    myszkowskiE: (t, key) => call('trans.myszkowskiE', t, key), myszkowskiD: (t, key) => call('trans.myszkowskiD', t, key)
  };
  window.AtBash = { e: t => call('atbash.e', t), d: t => call('atbash.e', t) };
  window.BaseConverter = { convert: (t, fromBase, toBase) => call('base.convert', t, fromBase, toBase), convertByChar: (t, fromBase, toBase) => call('base.convertByChar', t, fromBase, toBase) };
  window.A1Z26Cipher = { e: (t, mode) => call('a1z26.e', t, mode), d: (t, mode) => call('a1z26.d', t, mode) };
  window.MorseCode = { e: t => call('morse.e', t), d: t => call('morse.d', t) };
  window.MorseVariants = { process: (t, variant, key) => call('morse.process', t, variant, key) };
  window.PhoneKeyCipher = { e: t => call('phone.e', t), d: t => call('phone.d', t) };
  window.BealeCipher = { e: (t, key) => call('beale.e', t, key), d: (t, key) => call('beale.e', t, key) };
  window.FanqieCipher = { e: t => call('fanqie.e', t), d: t => call('fanqie.d', t) };
  window.BaconCipher = { e: t => call('bacon.e', t), d: t => call('bacon.d', t) };
  window.QweCipher = { e: t => call('qwe.e', t), d: t => call('qwe.d', t) };
  window.DnaCipher = { e: t => call('dna.e', t), d: t => call('dna.d', t) };
  window.VKeyboardCipher = { e: t => call('vkeyboard.e', t), d: t => call('vkeyboard.d', t) };
  window.Cipher01248 = { e: t => call('cipher01248.e', t), d: t => call('cipher01248.d', t) };
  window.VowelCipher = { e: t => call('vowel.e', t), d: t => call('vowel.d', t) };
  window.PigpenCipher = { e: t => call('symbol.pigpenE', t), d: t => call('symbol.pigpenD', t) };
  window.DancingMenCipher = { e: t => call('symbol.dancingE', t), d: t => call('symbol.dancingD', t) };
  window.ASCIIHandler = { convert: (t, inputType, outputType) => call('ascii.convert', t, inputType, outputType) };
  window.CCCHandler = { convert: t => call('ccc.convert', t), e: t => call('ccc.convert', t), d: t => call('ccc.convert', t) };
  window.fourCCCHandler = { convert: t => call('fourccc.convert', t), e: t => call('fourccc.convert', t), d: t => call('fourccc.convert', t) };
  window.ROTCipher = { e: (t, type) => call('rot.e', t, type), d: (t, type) => call('rot.e', t, type) };
  window.PolybiusCipher = { e: (t, abc, rows, cols) => call('polybius.e', t, abc, rows, cols), d: (t, abc, rows, cols) => call('polybius.d', t, abc, rows, cols) };
  window.PolybiusVariants = { process: (t, variant, abc, rows, cols, keyA, keyB, period) => call('polybius.process', t, variant, abc, rows, cols, keyA, keyB, period) };
  window.PlayfairCipher = { e: (t, key) => call('playfair.e', t, key), d: (t, key) => call('playfair.d', t, key) };
  window.ADFGXCipher = { ect: (t, alpha, key, type) => call('adfgx.e', t, alpha, key, type), dpt: (t, alpha, key, type) => call('adfgx.d', t, alpha, key, type) };
  window.Affine = { e: (t, alpha, a, b) => call('affine.e', t, alpha, a, b), d: (t, alpha, a, b) => call('affine.d', t, alpha, a, b) };
  window.TapCode = { e: (t, tap, group, letter) => call('tap.e', t, tap, group, letter), d: (t, tap, group, letter) => call('tap.d', t, tap, group, letter) };
  window.Bifid = { e: (t, key) => call('bifid.e', t, key), d: (t, key) => call('bifid.d', t, key) };
  window.baseCipher = { e: (t, kind) => call('baseCipher.e', t, kind), d: (t, kind) => call('baseCipher.d', t, kind) };
  window.ColumnarRailCipher = { e: (t, cols) => call('columnar.e', t, cols), d: (t, cols) => call('columnar.d', t, cols) };
  window.WShapeRailFenceCipher = { e: (t, rails) => call('wrail.e', t, rails), d: (t, rails) => call('wrail.d', t, rails) };
  window.SubstitutionTools = { analyze: (t, plain, cipher, manual, cribCipher, cribPlain) => call('substitution.analyze', t, plain, cipher, manual, cribCipher, cribPlain) };
  window.HillCipher = { run: (t, key, size, decrypt) => call(decrypt ? 'hill.d' : 'hill.e', t, key, size), process: (t, key, size) => call('hill.process', t, key, size) };
  window.MD5Cipher = { e: t => call('md5.e', t), hmac: (key, message) => call('md5.hmac', key, message) };
  window.SHA1Cipher = { e: t => hash('SHA-1', 'digest', t), hmac: (key, message) => hash('SHA-1', 'hmac', message, key) };
  window.SHA256Cipher = { e: t => hash('SHA-256', 'digest', t), hmac: (key, message) => hash('SHA-256', 'hmac', message, key) };
  window.SHA384Cipher = { e: t => hash('SHA-384', 'digest', t), hmac: (key, message) => hash('SHA-384', 'hmac', message, key) };
  window.SHA512Cipher = { e: t => hash('SHA-512', 'digest', t), hmac: (key, message) => hash('SHA-512', 'hmac', message, key) };

  function StringContent(value) { this.value = String(value && value.getString ? value.getString() : (value ?? '')); }
  StringContent.prototype.getString = function () { return this.value; };
  window.StringContent = StringContent;

  function EnigmaEncoder() { this.settings = {}; }
  EnigmaEncoder.getModel = name => (window.Enigmamodels || []).find(model => model.name === name) || null;
  EnigmaEncoder.getRotor = name => call('enigma.rotorExists', name) ? { name } : null;
  EnigmaEncoder.prototype.setSettingValue = function (key, value) { this.settings[key] = value; };
  EnigmaEncoder.prototype.applyModel = function (name) { this.settings.model = name; };
  EnigmaEncoder.prototype.encode = function (content) {
    const value = content && content.getString ? content.getString() : String(content ?? '');
    return new StringContent(window.__rustCipherEnigma(this.settings, value));
  };
  EnigmaEncoder.prototype.decode = EnigmaEncoder.prototype.encode;
  window.EnigmaEncoder = EnigmaEncoder;
})();
"#;
    Function::new_no_args(script).call0(&JsValue::NULL)?;
    Ok(())
}

fn install_qiyu_global_maps(win: &Window) -> Result<(), JsValue> {
    let (semaphore_map, char_to_semaphore) = qiyu_maps("semaphore");
    let (braille_map, char_to_braille) = qiyu_maps("braille");
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("semaphoreMap"),
        build_bits_to_char_object(&semaphore_map).as_ref(),
    )?;
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("brailleMap"),
        build_bits_to_char_object(&braille_map).as_ref(),
    )?;
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("charToSemaphore"),
        build_char_to_bits_object(&char_to_semaphore).as_ref(),
    )?;
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("charToBraille"),
        build_char_to_bits_object(&char_to_braille).as_ref(),
    )?;
    Ok(())
}

fn build_bits_to_char_object(map: &HashMap<u32, char>) -> Object {
    let object = Object::new();
    for (bits, ch) in map {
        let _ = Reflect::set(
            object.as_ref(),
            &JsValue::from_str(&bits.to_string()),
            &JsValue::from_str(&ch.to_string()),
        );
    }
    object
}

fn build_char_to_bits_object(map: &HashMap<char, u32>) -> Object {
    let object = Object::new();
    for (ch, bits) in map {
        let _ = Reflect::set(
            object.as_ref(),
            &JsValue::from_str(&ch.to_string()),
            &JsValue::from_f64(*bits as f64),
        );
    }
    object
}

fn install_enigma_global_models(win: &Window) -> Result<(), JsValue> {
    let models = Array::new();
    for model in enigma_models() {
        let item = Object::new();
        Reflect::set(item.as_ref(), &JsValue::from_str("name"), &JsValue::from_str(model.name))?;
        Reflect::set(item.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(model.label))?;
        Reflect::set(
            item.as_ref(),
            &JsValue::from_str("plugboard"),
            &JsValue::from_bool(model.plugboard),
        )?;
        if let Some(description) = model.description {
            Reflect::set(
                item.as_ref(),
                &JsValue::from_str("description"),
                &JsValue::from_str(description),
            )?;
        }
        models.push(item.as_ref());
    }
    Reflect::set(win.as_ref(), &JsValue::from_str("Enigmamodels"), models.as_ref())?;
    Reflect::set(win.as_ref(), &JsValue::from_str("models"), models.as_ref())?;
    Ok(())
}

fn cipher_dispatch(op: &str, args: &Array) -> String {
    let text = arg_string(args, 0, "");
    match op {
        "caesar.e" => caesar_shift(&text, arg_i32(args, 1, 3)),
        "caesar.d" => caesar_shift(&text, -arg_i32(args, 1, 3)),
        "caesar.brute" => caesar_brute(&text),
        "vigenere.e" => vigenere_encrypt(&text, &arg_string(args, 1, "KEY")),
        "vigenere.d" => vigenere_decrypt(&text, &arg_string(args, 1, "KEY")),
        "vigenere.process" => vigenere_process(&text, &arg_string(args, 1, "KEY"), &arg_string(args, 2, "vigenere")),
        "vigenere.beaufort" => {
            let keys: Vec<i32> = vigenere_key_letters(&arg_string(args, 1, "KEY"), "KEY")
                .into_iter()
                .map(alpha_val)
                .collect();
            vigenere_run(&text, &keys, |value, shift| shift - value)
        }
        "vigenere.variantE" => vigenere_decrypt(&text, &arg_string(args, 1, "KEY")),
        "vigenere.variantD" => vigenere_encrypt(&text, &arg_string(args, 1, "KEY")),
        "vigenere.autokeyE" => vigenere_autokey_encrypt(&text, &arg_string(args, 1, "KEY")),
        "vigenere.autokeyD" => vigenere_autokey_decrypt(&text, &arg_string(args, 1, "KEY")),
        "vigenere.gronsfeldE" => vigenere_run(&text, &vigenere_key_digits(&arg_string(args, 1, "31415")), |value, shift| value + shift),
        "vigenere.gronsfeldD" => vigenere_run(&text, &vigenere_key_digits(&arg_string(args, 1, "31415")), |value, shift| value - shift),
        "vigenere.porta" => vigenere_porta(&text, &arg_string(args, 1, "KEY")),
        "rail.e" => rail_fence_encode(&text, arg_i32(args, 1, 3)),
        "rail.d" => rail_fence_decode(&text, arg_i32(args, 1, 3)),
        "trans.process" => transposition_process(&text, arg_i32(args, 1, 3), &arg_string(args, 2, "BALLOON"), &arg_string(args, 3, "railFence")),
        "trans.routeE" => route_encode(&text, arg_i32(args, 1, 3)),
        "trans.routeD" => route_decode(&text, arg_i32(args, 1, 3)),
        "trans.scytaleE" => columnar_rail_encode(&text, arg_i32(args, 1, 3)),
        "trans.scytaleD" => columnar_rail_decode(&text, arg_i32(args, 1, 3)),
        "trans.amscoE" => amsco_encode(&text, &arg_string(args, 1, "3142"), arg_i32(args, 2, 3)),
        "trans.amscoD" => amsco_decode(&text, &arg_string(args, 1, "3142"), arg_i32(args, 2, 3)),
        "trans.myszkowskiE" => myszkowski_encode(&text, &arg_string(args, 1, "BALLOON")),
        "trans.myszkowskiD" => myszkowski_decode(&text, &arg_string(args, 1, "BALLOON")),
        "atbash.e" => atbash(&text),
        "base.convert" => base_convert(&text, arg_i32(args, 1, 36), arg_i32(args, 2, 10)),
        "base.convertByChar" => base_convert_by_char(&text, arg_i32(args, 1, 36), arg_i32(args, 2, 10)),
        "a1z26.e" => a1z26_encode(&text, &arg_string(args, 1, "a1")),
        "a1z26.d" => a1z26_decode(&text, &arg_string(args, 1, "a1")),
        "morse.e" => morse_encode(&text),
        "morse.d" => morse_decode(&text),
        "morse.process" => morse_process(&text, &arg_string(args, 1, "morse"), &arg_string(args, 2, "KEYWORD")),
        "phone.e" => phone_encode(&text),
        "phone.d" => phone_decode(&text),
        "beale.e" => beale_encode(&text, &arg_string(args, 1, "")),
        "fanqie.e" => fanqie_decode(&text),
        "fanqie.d" => fanqie_encode(&text),
        "bacon.e" => bacon_encode(&text),
        "bacon.d" => bacon_decode(&text),
        "qwe.e" => qwe_decode(&text),
        "qwe.d" => qwe_encode(&text),
        "dna.e" => dna_decode(&text),
        "dna.d" => dna_encode(&text),
        "vkeyboard.e" => v_keyboard_decode(&text),
        "vkeyboard.d" => v_keyboard_encode(&text),
        "cipher01248.e" => cipher01248_encode(&text),
        "cipher01248.d" => cipher01248_decode(&text),
        "vowel.e" => vowel_encode(&text),
        "vowel.d" => vowel_decode(&text),
        "symbol.pigpenE" => symbol_encode("pigpen", &text),
        "symbol.pigpenD" => symbol_decode("pigpen", &text),
        "symbol.dancingE" => symbol_encode("dancingMen", &text),
        "symbol.dancingD" => symbol_decode("dancingMen", &text),
        "ascii.convert" => ascii_convert(&text, &arg_string(args, 1, "char"), &arg_string(args, 2, "dec")),
        "ccc.convert" => ccc_convert(&text),
        "fourccc.convert" => four_ccc_convert(&text),
        "rot.e" => rot_cipher(&text, &arg_string(args, 1, "dec")),
        "polybius.e" => polybius_encode(&text, &arg_string(args, 1, "abcdefghiklmnopqrstuvwxyz"), &arg_string(args, 2, "12345"), &arg_string(args, 3, "12345")),
        "polybius.d" => polybius_decode(&text, &arg_string(args, 1, "abcdefghiklmnopqrstuvwxyz"), &arg_string(args, 2, "12345"), &arg_string(args, 3, "12345")),
        "polybius.process" => polybius_process(
            &text,
            &arg_string(args, 1, "polybius"),
            &arg_string(args, 2, "abcdefghiklmnopqrstuvwxyz"),
            &arg_string(args, 3, "12345"),
            &arg_string(args, 4, "12345"),
            &arg_string(args, 5, "keyword"),
            &arg_string(args, 6, "cipher"),
            arg_i32(args, 7, 5),
        ),
        "playfair.e" => playfair_encode(&text, &arg_string(args, 1, "keyword")),
        "playfair.d" => playfair_decode(&text, &arg_string(args, 1, "keyword")),
        "adfgx.e" => adfgx_encrypt(&text, &arg_string(args, 1, "abcdefghiklmnopqrstuvwxyz"), &arg_string(args, 2, "password"), &arg_string(args, 3, "ADFGX")),
        "adfgx.d" => adfgx_decrypt(&text, &arg_string(args, 1, "abcdefghiklmnopqrstuvwxyz"), &arg_string(args, 2, "password"), &arg_string(args, 3, "ADFGX")),
        "affine.e" => affine_encrypt(&text, &arg_string(args, 1, "abcdefghijklmnopqrstuvwxyz"), arg_i32(args, 2, 5), arg_i32(args, 3, 8)),
        "affine.d" => affine_decrypt(&text, &arg_string(args, 1, "abcdefghijklmnopqrstuvwxyz"), arg_i32(args, 2, 5), arg_i32(args, 3, 8)),
        "tap.e" => tap_encode(&text, &arg_string(args, 1, "."), &arg_string(args, 2, " "), &arg_string(args, 3, "  ")),
        "tap.d" => tap_decode(&text, &arg_string(args, 1, "."), &arg_string(args, 2, " "), &arg_string(args, 3, "  ")),
        "bifid.e" => bifid_encode(&text, &arg_string(args, 1, "")),
        "bifid.d" => bifid_decode(&text, &arg_string(args, 1, "")),
        "baseCipher.e" => base_cipher_encode(&text, &arg_string(args, 1, "base64")),
        "baseCipher.d" => base_cipher_decode(&text, &arg_string(args, 1, "base64")),
        "columnar.e" => columnar_rail_encode(&text, arg_i32(args, 1, 2)),
        "columnar.d" => columnar_rail_decode(&text, arg_i32(args, 1, 2)),
        "wrail.e" => w_rail_encode(&text, arg_i32(args, 1, 3)),
        "wrail.d" => w_rail_decode(&text, arg_i32(args, 1, 3)),
        "substitution.analyze" => substitution_analyze(
            &text,
            &arg_string(args, 1, "abcdefghijklmnopqrstuvwxyz"),
            &arg_string(args, 2, "qwertyuiopasdfghjklzxcvbnm"),
            &arg_string(args, 3, ""),
            &arg_string(args, 4, ""),
            &arg_string(args, 5, ""),
        ),
        "hill.e" => hill_run(&text, &arg_string(args, 1, "3 3 2 5"), &arg_string(args, 2, "2"), false),
        "hill.d" => hill_run(&text, &arg_string(args, 1, "3 3 2 5"), &arg_string(args, 2, "2"), true),
        "hill.process" => hill_process(&text, &arg_string(args, 1, "3 3 2 5"), &arg_string(args, 2, "2")),
        "md5.e" => hex_lower(&md5_digest(text.as_bytes())),
        "md5.hmac" => md5_hmac_result(&text, &arg_string(args, 1, "")),
        "enigma.rotorExists" => {
            if enigma_rotor(&text).is_some() {
                "1".to_string()
            } else {
                String::new()
            }
        }
        _ => String::new(),
    }
}

fn arg_string(args: &Array, index: u32, fallback: &str) -> String {
    let value = args.get(index);
    if value.is_undefined() || value.is_null() {
        fallback.to_string()
    } else {
        let text = js_value_to_string(value);
        if text.is_empty() && !fallback.is_empty() {
            fallback.to_string()
        } else {
            text
        }
    }
}

fn arg_i32(args: &Array, index: u32, fallback: i32) -> i32 {
    let value = args.get(index);
    js_value_to_i32(value, fallback)
}

fn js_value_to_string(value: JsValue) -> String {
    if value.is_null() || value.is_undefined() {
        return String::new();
    }
    if let Some(text) = value.as_string() {
        return text;
    }
    if let Some(number) = value.as_f64() {
        if number.fract() == 0.0 {
            return (number as i64).to_string();
        }
        return number.to_string();
    }
    if let Some(boolean) = value.as_bool() {
        return boolean.to_string();
    }
    Reflect::get(value.as_ref(), &JsValue::from_str("toString"))
        .ok()
        .and_then(|func| func.dyn_into::<Function>().ok())
        .and_then(|func| func.call0(value.as_ref()).ok())
        .and_then(|text| text.as_string())
        .unwrap_or_default()
}

fn js_value_to_i32(value: JsValue, fallback: i32) -> i32 {
    if value.is_null() || value.is_undefined() {
        return fallback;
    }
    value
        .as_f64()
        .map(|number| number as i32)
        .or_else(|| js_value_to_string(value).parse::<i32>().ok())
        .unwrap_or(fallback)
}

fn js_prop_string(object: &JsValue, key: &str, fallback: &str) -> String {
    Reflect::get(object, &JsValue::from_str(key))
        .ok()
        .map(js_value_to_string)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn js_prop_i32(object: &JsValue, key: &str, fallback: i32) -> i32 {
    Reflect::get(object, &JsValue::from_str(key))
        .ok()
        .map(|value| js_value_to_i32(value, fallback))
        .unwrap_or(fallback)
}

fn enigma_translate_from_js(settings: &JsValue, content: &str) -> String {
    let model_name = js_prop_string(settings, "model", "M3");
    let model = enigma_model(if model_name.is_empty() { "M3" } else { &model_name })
        .or_else(|| enigma_model("M3"))
        .expect("M3 enigma model must exist");
    let reflector_fallback = model.reflector_rotors.first().copied().unwrap_or("UKW-B");
    let reflector = {
        let candidate = js_prop_string(settings, "reflector", reflector_fallback);
        if enigma_rotor(&candidate).is_some() {
            candidate
        } else {
            reflector_fallback.to_string()
        }
    };
    let reflector_position = js_prop_i32(settings, "reflectorPosition", 1).clamp(1, 26);
    let reflector_ring = js_prop_i32(settings, "reflectorRing", 1).clamp(1, 26);
    let mut rotors = Vec::new();
    let mut positions = Vec::new();
    let mut rings = Vec::new();
    for (index, slot) in model.slots.iter().enumerate() {
        let fallback = slot.rotors.first().copied().unwrap_or("I");
        let key_index = index + 1;
        let rotor = js_prop_string(settings, &format!("rotor{key_index}"), fallback);
        if enigma_rotor(&rotor).is_some() {
            rotors.push(rotor);
        } else {
            rotors.push(fallback.to_string());
        }
        positions.push(js_prop_i32(settings, &format!("position{key_index}"), 1).clamp(1, 26));
        rings.push(js_prop_i32(settings, &format!("ring{key_index}"), 1).clamp(1, 26));
    }
    let plugboard = if model.plugboard {
        js_prop_string(settings, "plugboard", "")
    } else {
        String::new()
    };
    enigma_translate(
        content,
        &model,
        &reflector,
        reflector_position,
        reflector_ring,
        &rotors,
        &positions,
        &rings,
        &plugboard,
        true,
    )
}

fn bind_input_sync() -> Result<(), JsValue> {
    let selectors = [
        "#mimaqu #mainInput",
        "#xiandaiqu #mainInput",
        "#workflow-content #mainInputCoze",
    ];
    for selector in selectors {
        let Some(element) = document()?.query_selector(selector)? else {
            continue;
        };
        let selector = selector.to_string();
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            let value = event
                .target()
                .and_then(|target| target.dyn_into::<Element>().ok())
                .map(|target| element_value(&target))
                .unwrap_or_default();

            for target_selector in [
                "#mimaqu #mainInput",
                "#xiandaiqu #mainInput",
                "#workflow-content #mainInputCoze",
            ] {
                if target_selector == selector {
                    continue;
                }
                if let Ok(Some(target)) = document().and_then(|doc| doc.query_selector(target_selector)) {
                    set_element_value(&target, &value);
                }
            }
        }));
        element.add_event_listener_with_callback("input", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }
    Ok(())
}

fn bind_update_events() -> Result<(), JsValue> {
    for element in elements(
        "#mimaqu input:not(.quick-nav-input), #mimaqu textarea, #mimaqu select, #xiandaiqu input:not(.quick-nav-input), #xiandaiqu textarea, #xiandaiqu select, #workflow-content #mainInputCoze",
    )? {
        let input = Closure::<dyn FnMut(Event)>::wrap(Box::new(|_event: Event| {
            schedule_update_all();
        }));
        element.add_event_listener_with_callback("input", input.as_ref().unchecked_ref())?;
        input.forget();

        let change = Closure::<dyn FnMut(Event)>::wrap(Box::new(|_event: Event| {
            schedule_update_all();
        }));
        element.add_event_listener_with_callback("change", change.as_ref().unchecked_ref())?;
        change.forget();
    }

    for button in elements("#jiamishiyanshi-content .submodule-btn")? {
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(|_event: Event| {
            schedule_update_all();
        }));
        button.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }

    for item in elements(".menu-item[data-target=\"jiamishiyanshi\"]")? {
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(|_event: Event| {
            schedule_update_all();
        }));
        item.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }

    Ok(())
}

fn schedule_update_all() {
    let already_pending = UPDATE_PENDING.with(|pending| {
        let old = pending.get();
        if !old {
            pending.set(true);
        }
        old
    });
    if already_pending {
        return;
    }
    request_animation_frame(|| {
        UPDATE_PENDING.with(|pending| pending.set(false));
        if let Err(err) = update_all() {
            console::error_1(&err);
        }
    });
}

fn update_all() -> Result<(), JsValue> {
    if !is_cipher_lab_visible() {
        return Ok(());
    }
    let active_submodule = active_cipher_submodule().unwrap_or_else(|| "mimaqu".to_string());
    let update_classic = active_submodule == "mimaqu";
    let update_modern = active_submodule == "xiandaiqu";
    if !update_classic && !update_modern {
        return Ok(());
    }

    let t = if update_modern {
        query_value("#xiandaiqu #mainInput")
            .or_else(|| query_value("#mimaqu #mainInput"))
            .unwrap_or_default()
    } else {
        query_value("#mimaqu #mainInput")
            .or_else(|| query_value("#xiandaiqu #mainInput"))
            .unwrap_or_default()
    };
    let symbol_cipher_text = value_by_id("symbolCipherInput", "");
    let symbol_cipher_type = value_by_id("symbolCipherType", "pigpen");

    if t.is_empty() && symbol_cipher_text.is_empty() {
        clear_cipher_results()?;
        return Ok(());
    }
    if t.is_empty() {
        clear_cipher_results()?;
        if !symbol_cipher_text.is_empty() {
            set_text(
                "symbolCipherResult",
                &format!(
                    "编码: {}\n解码: {}",
                    symbol_encode(&symbol_cipher_type, &symbol_cipher_text),
                    symbol_decode(&symbol_cipher_type, &symbol_cipher_text)
                ),
            );
        }
        return Ok(());
    }

    if update_modern {
        update_modern_results(&t);
        return Ok(());
    }

    let caesar_shift_value = int_value("caesarShift", 0);
    let mut caesar_text = format!(
        "加密: {}\n解密: {}",
        caesar_shift(&t, caesar_shift_value),
        caesar_shift(&t, -caesar_shift_value)
    );
    if CAESAR_SHOW_ALL.with(Cell::get) {
        caesar_text.push_str("\n\n一键枚举:\n");
        caesar_text.push_str(&caesar_brute(&t));
    }
    set_text("caesarResult", &caesar_text);

    let vigenere_key = non_empty_value("vigenereKey", "KEY");
    let vigenere_variant = non_empty_value("vigenereVariant", "vigenere");
    set_text(
        "vigenereResult",
        &vigenere_process(&t, &vigenere_key, &vigenere_variant),
    );

    let rail_count = int_value("railCount", 3);
    let rail_key = non_empty_value("railKey", "BALLOON");
    let rail_variant = non_empty_value("railVariant", "railFence");
    set_text(
        "railResult",
        &transposition_process(&t, rail_count, &rail_key, &rail_variant),
    );
    set_text("atbashResult", &format!("解密: {}", atbash(&t)));

    let from_base = int_value("fromBase", 36);
    let to_base = int_value("toBase", 2);
    set_text(
        "baseResult",
        &format!(
            "结果: {}\n字符隔开结果: {}",
            base_convert(&t, from_base, to_base),
            base_convert_by_char(&t, from_base, to_base)
        ),
    );

    let a1z26_mode = non_empty_value("a1z26Mode", "a1");
    set_text(
        "a1z26Result",
        &format!(
            "编码: {}\n解码: {}",
            a1z26_encode(&t, &a1z26_mode),
            a1z26_decode(&t, &a1z26_mode)
        ),
    );

    let morse_variant = non_empty_value("morseVariant", "morse");
    let morse_key = non_empty_value("morseKey", "KEYWORD");
    set_text("morseResult", &morse_process(&t, &morse_variant, &morse_key));

    set_text(
        "phoneResult",
        &format!("加密: {}\n解密: {}", phone_encode(&t), phone_decode(&t)),
    );

    let beale_key = value_by_id("bealeKey", "");
    set_text("bealeResult", &format!("解密: {}", beale_encode(&t, &beale_key)));
    set_text(
        "fanqieResult",
        &format!("解密: {}\n加密: {}", fanqie_decode(&t), fanqie_encode(&t)),
    );
    set_text("dnaResult", &format!("解密: {}\n加密: {}", dna_decode(&t), dna_encode(&t)));
    set_text(
        "vKeyboardResult",
        &format!("解密: {}\n加密: {}", v_keyboard_decode(&t), v_keyboard_encode(&t)),
    );
    set_text("qweResult", &format!("解密: {}\n加密: {}", qwe_decode(&t), qwe_encode(&t)));
    set_text("baconResult", &format!("加密: {}\n解密: {}", bacon_encode(&t), bacon_decode(&t)));

    let symbol_source = if symbol_cipher_text.is_empty() {
        &t
    } else {
        &symbol_cipher_text
    };
    set_text(
        "symbolCipherResult",
        &format!(
            "编码: {}\n解码: {}",
            symbol_encode(&symbol_cipher_type, symbol_source),
            symbol_decode(&symbol_cipher_type, symbol_source)
        ),
    );

    let columnar_rails = int_value("columnarRailCount", 2);
    set_text(
        "columnarRailResult",
        &format!(
            "加密: {}\n解密: {}",
            columnar_rail_encode(&t, columnar_rails),
            columnar_rail_decode(&t, columnar_rails)
        ),
    );

    let w_rails = int_value("wRailCount", 3);
    set_text(
        "wRailResult",
        &format!("加密: {}\n解密: {}", w_rail_encode(&t, w_rails), w_rail_decode(&t, w_rails)),
    );
    set_text(
        "cipher01248Result",
        &format!("加密: {}\n解密: {}", cipher01248_encode(&t), cipher01248_decode(&t)),
    );
    set_text(
        "vowelCipherResult",
        &format!("加密: {}\n解密: {}", vowel_encode(&t), vowel_decode(&t)),
    );

    let ascii_input_type = value_by_id("asciiInputType", "char");
    let ascii_output_type = value_by_id("asciiOutputType", "dec");
    set_text(
        "asciiResult",
        &format!("结果: {}", ascii_convert(&t, &ascii_input_type, &ascii_output_type)),
    );
    set_text("cccResult", &format!("结果: {}", ccc_convert(&t)));
    set_text("fourcccResult", &format!("结果: {}", four_ccc_convert(&t)));
    let rot_output_type = value_by_id("rotOutputType", "dec");
    set_text("rotResult", &format!("结果: {}", rot_cipher(&t, &rot_output_type)));

    let ps_alpha = value_by_id("psAlpha", "");
    let ps_rows = value_by_id("psRows", "");
    let ps_columns = value_by_id("psColumns", "");
    let polybius_variant = non_empty_value("polybiusVariant", "polybius");
    let polybius_key_a = non_empty_value("polybiusKeyA", "keyword");
    let polybius_key_b = non_empty_value("polybiusKeyB", "cipher");
    let polybius_period = int_value("polybiusPeriod", 5);
    set_text(
        "PolybiusResult",
        &polybius_process(
            &t,
            &polybius_variant,
            &ps_alpha,
            &ps_rows,
            &ps_columns,
            &polybius_key_a,
            &polybius_key_b,
            polybius_period,
        ),
    );

    let playfair_key = non_empty_value("playfairKey", "keyword");
    set_text(
        "playfairResult",
        &format!("加密: {}\n解密: {}", playfair_encode(&t, &playfair_key), playfair_decode(&t, &playfair_key)),
    );

    let adf_alpha = value_by_id("ADFAlpha", "");
    let adf_key = value_by_id("ADFTranspositionKeyword", "");
    let adf_type = value_by_id("adfCipherType", "ADFGX");
    set_text(
        "ADFGXResult",
        &format!(
            "加密: {}\n解密: {}",
            adfgx_encrypt(&t, &adf_alpha, &adf_key, &adf_type),
            adfgx_decrypt(&t, &adf_alpha, &adf_key, &adf_type)
        ),
    );

    let affine_alpha = value_by_id("AffineAlpha", "abcdefghijklmnopqrstuvwxyz");
    let affine_a = int_value("Affineslope", 5);
    let affine_b = int_value("AffineIntercept", 8);
    set_text(
        "AffineResult",
        &format!(
            "加密: {}\n解密: {}",
            affine_encrypt(&t, &affine_alpha, affine_a, affine_b),
            affine_decrypt(&t, &affine_alpha, affine_a, affine_b)
        ),
    );

    let tap_mark = non_empty_value("tapMark", ".");
    let group_mark = non_empty_value("groupMark", " ");
    let letter_mark = non_empty_value("letterMark", "  ");
    set_text(
        "tapCodeResult",
        &format!(
            "加密: {}\n解密: {}",
            tap_encode(&t, &tap_mark, &group_mark, &letter_mark),
            tap_decode(&t, &tap_mark, &group_mark, &letter_mark)
        ),
    );

    let bifid_key = value_by_id("BifidCipherkey", "");
    set_text(
        "BifidCipherResult",
        &format!("加密: {}\n解密: {}", bifid_encode(&t, &bifid_key), bifid_decode(&t, &bifid_key)),
    );

    let base_output_type = value_by_id("baseOutputType", "base64");
    set_text(
        "baseEncodeResult",
        &format!(
            "结果: {}\n加密结果: {}",
            base_cipher_encode(&t, &base_output_type),
            base_cipher_decode(&t, &base_output_type)
        ),
    );

    Ok(())
}

fn update_modern_results(text: &str) {
    let subst_plain_alphabet = non_empty_value("substPlainAlphabet", "abcdefghijklmnopqrstuvwxyz");
    let subst_cipher_alphabet = non_empty_value("substCipherAlphabet", "qwertyuiopasdfghjklzxcvbnm");
    let subst_manual_map = value_by_id("substManualMap", "");
    let subst_crib_cipher = value_by_id("substCribCipher", "");
    let subst_crib_plain = value_by_id("substCribPlain", "");
    set_text(
        "substitutionResult",
        &substitution_analyze(
            text,
            &subst_plain_alphabet,
            &subst_cipher_alphabet,
            &subst_manual_map,
            &subst_crib_cipher,
            &subst_crib_plain,
        ),
    );

    let hill_size = non_empty_value("hillSize", "2");
    let hill_key = non_empty_value("hillKey", "3 3 2 5");
    set_text("hillResult", &hill_process(text, &hill_key, &hill_size));

    let md5_key = value_by_id("MD5Key", "");
    set_text(
        "MD5Result",
        &format!(
            "MD5结果: {}\nHMAC结果: {}",
            hex_lower(&md5_digest(text.as_bytes())),
            md5_hmac_result(&md5_key, text)
        ),
    );

    process_enigma();
    update_sha_results(text.to_string());
}

fn substitution_unique(text: &str) -> String {
    let mut seen = HashSet::new();
    text.chars()
        .filter(|c| !c.is_control() && seen.insert(*c))
        .collect()
}

fn substitution_map(from: &str, to: &str) -> HashMap<char, char> {
    let from = substitution_unique(from);
    let to = substitution_unique(to);
    let mut map = HashMap::new();
    for (a, b) in from.chars().zip(to.chars()) {
        map.insert(a, b);
        if a.is_ascii_alphabetic() && b.is_ascii_alphabetic() {
            map.insert(a.to_ascii_uppercase(), b.to_ascii_uppercase());
            map.insert(a.to_ascii_lowercase(), b.to_ascii_lowercase());
        }
    }
    map
}

fn substitution_apply_map(text: &str, map: &HashMap<char, char>, unknown: Option<char>) -> String {
    text.chars()
        .map(|c| {
            if let Some(mapped) = map.get(&c).or_else(|| map.get(&c.to_ascii_uppercase())) {
                if c.is_ascii_lowercase() {
                    mapped.to_ascii_lowercase()
                } else {
                    mapped.to_ascii_uppercase()
                }
            } else if c.is_ascii_alphabetic() {
                unknown.unwrap_or(c)
            } else {
                c
            }
        })
        .collect()
}

fn substitution_apply_alphabet(text: &str, from: &str, to: &str) -> String {
    substitution_apply_map(text, &substitution_map(from, to), None)
}

fn substitution_frequency(text: &str) -> String {
    let mut counts: HashMap<char, usize> = HashMap::new();
    let mut total = 0usize;
    for c in text.to_uppercase().chars().filter(|c| c.is_ascii_uppercase()) {
        *counts.entry(c).or_insert(0) += 1;
        total += 1;
    }
    if counts.is_empty() {
        return "无字母".to_string();
    }
    let mut rows: Vec<(char, usize)> = counts.into_iter().collect();
    rows.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(&b.0)));
    rows.into_iter()
        .map(|(c, count)| format!("{c}:{count}({}%)", (count * 100 + total / 2) / total))
        .collect::<Vec<_>>()
        .join(" ")
}

fn substitution_parse_manual(manual: &str) -> HashMap<char, char> {
    let mut map = HashMap::new();
    for part in manual
        .split(|c: char| c.is_whitespace() || c == ',' || c == ';')
        .filter(|part| !part.is_empty())
    {
        let pair: Vec<&str> = part
            .split(|c| matches!(c, ':' | '=' | '-' | '＞' | '>'))
            .filter(|part| !part.is_empty())
            .collect();
        if pair.len() < 2 {
            continue;
        }
        let left: Vec<char> = pair[0]
            .to_uppercase()
            .chars()
            .filter(|c| c.is_ascii_uppercase())
            .collect();
        let right: Vec<char> = pair[1]
            .to_uppercase()
            .chars()
            .filter(|c| c.is_ascii_uppercase())
            .collect();
        for (a, b) in left.into_iter().zip(right.into_iter()) {
            map.insert(a, b);
        }
    }
    map
}

fn substitution_crib_map(cipher: &str, plain: &str) -> (HashMap<char, char>, Vec<String>) {
    let mut map = HashMap::new();
    let mut conflicts = Vec::new();
    for (cipher_char, plain_char) in cipher.to_uppercase().chars().zip(plain.to_uppercase().chars()) {
        if !cipher_char.is_ascii_uppercase() || !plain_char.is_ascii_uppercase() {
            continue;
        }
        if let Some(existing) = map.get(&cipher_char) {
            if *existing != plain_char {
                conflicts.push(format!("{cipher_char}:{existing}/{plain_char}"));
            }
        }
        map.insert(cipher_char, plain_char);
    }
    (map, conflicts)
}

fn replace_crib(text: &str, cipher: &str, plain: &str) -> String {
    if cipher.is_empty() || plain.is_empty() {
        return "未设置".to_string();
    }
    let source: Vec<char> = text.chars().collect();
    let needle: Vec<char> = cipher.chars().collect();
    if needle.is_empty() {
        return text.to_string();
    }
    let mut out = String::new();
    let mut index = 0usize;
    while index < source.len() {
        let matches = index + needle.len() <= source.len()
            && source[index..index + needle.len()]
                .iter()
                .zip(needle.iter())
                .all(|(a, b)| a.eq_ignore_ascii_case(b));
        if matches {
            let matched: String = source[index..index + needle.len()].iter().collect();
            if matched.chars().all(|c| !c.is_ascii_alphabetic() || c.is_ascii_uppercase()) {
                out.push_str(&plain.to_uppercase());
            } else {
                out.push_str(&plain.to_lowercase());
            }
            index += needle.len();
        } else {
            out.push(source[index]);
            index += 1;
        }
    }
    out
}

fn substitution_analyze(
    text: &str,
    plain_alphabet: &str,
    cipher_alphabet: &str,
    manual: &str,
    crib_cipher: &str,
    crib_plain: &str,
) -> String {
    let mut merged = substitution_parse_manual(manual);
    let (crib, conflicts) = substitution_crib_map(crib_cipher, crib_plain);
    merged.extend(crib);
    let manual_result = if merged.is_empty() {
        "未设置".to_string()
    } else {
        substitution_apply_map(text, &merged, Some('.'))
    };
    let conflict_text = if conflicts.is_empty() {
        String::new()
    } else {
        format!("\nCrib冲突: {}", conflicts.join(" "))
    };
    format!(
        "任意字母表加密: {}\n任意字母表解密: {}\n频率分析: {}\n手动映射/Crib映射: {}\nCrib替换: {}{}",
        substitution_apply_alphabet(text, plain_alphabet, cipher_alphabet),
        substitution_apply_alphabet(text, cipher_alphabet, plain_alphabet),
        substitution_frequency(text),
        manual_result,
        replace_crib(text, crib_cipher, crib_plain),
        conflict_text
    )
}

fn hill_mod(value: i32) -> i32 {
    value.rem_euclid(26)
}

fn hill_inv_mod(value: i32) -> Option<i32> {
    let value = hill_mod(value);
    (1..26).find(|i| (value * i) % 26 == 1)
}

fn hill_parse_key(key: &str, size: usize) -> Option<Vec<Vec<i32>>> {
    let need = size * size;
    let mut values = parse_signed_numbers(key);
    if values.len() < need {
        values = key
            .to_uppercase()
            .chars()
            .filter(|c| c.is_ascii_uppercase())
            .map(alpha_val)
            .collect();
    }
    if values.len() < need {
        return None;
    }
    values.truncate(need);
    let values: Vec<i32> = values.into_iter().map(hill_mod).collect();
    Some(
        values
            .chunks(size)
            .map(|chunk| chunk.to_vec())
            .collect::<Vec<_>>(),
    )
}

fn parse_signed_numbers(text: &str) -> Vec<i32> {
    let mut values = Vec::new();
    let mut current = String::new();
    for c in text.chars() {
        if c.is_ascii_digit() || (c == '-' && current.is_empty()) {
            current.push(c);
        } else if !current.is_empty() && current != "-" {
            if let Ok(value) = current.parse::<i32>() {
                values.push(value);
            }
            current.clear();
        } else {
            current.clear();
        }
    }
    if !current.is_empty() && current != "-" {
        if let Ok(value) = current.parse::<i32>() {
            values.push(value);
        }
    }
    values
}

fn hill_det(matrix: &[Vec<i32>]) -> i32 {
    if matrix.len() == 2 {
        matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]
    } else {
        matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
            - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
            + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0])
    }
}

fn hill_inverse(matrix: &[Vec<i32>]) -> Option<Vec<Vec<i32>>> {
    let inv_det = hill_inv_mod(hill_det(matrix))?;
    if matrix.len() == 2 {
        return Some(vec![
            vec![hill_mod(matrix[1][1] * inv_det), hill_mod(-matrix[0][1] * inv_det)],
            vec![hill_mod(-matrix[1][0] * inv_det), hill_mod(matrix[0][0] * inv_det)],
        ]);
    }
    let mut cof = vec![vec![0; 3]; 3];
    for r in 0..3 {
        for c in 0..3 {
            let sub: Vec<Vec<i32>> = (0..3)
                .filter(|i| *i != r)
                .map(|i| (0..3).filter(|j| *j != c).map(|j| matrix[i][j]).collect())
                .collect();
            cof[r][c] = if (r + c) % 2 == 0 { 1 } else { -1 }
                * (sub[0][0] * sub[1][1] - sub[0][1] * sub[1][0]);
        }
    }
    Some(
        (0..3)
            .map(|r| (0..3).map(|c| hill_mod(cof[c][r] * inv_det)).collect())
            .collect(),
    )
}

fn hill_run(text: &str, key: &str, size: &str, decrypt: bool) -> String {
    let size = if size == "3" { 3 } else { 2 };
    let Some(mut matrix) = hill_parse_key(key, size) else {
        return "密钥长度不足".to_string();
    };
    if decrypt {
        let Some(inverse) = hill_inverse(&matrix) else {
            return "密钥矩阵不可逆".to_string();
        };
        matrix = inverse;
    }
    let mut clean: Vec<char> = text
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_uppercase())
        .collect();
    if clean.is_empty() {
        return String::new();
    }
    while clean.len() % size != 0 {
        clean.push('X');
    }
    let mut out = String::new();
    for block in clean.chunks(size) {
        for row in &matrix {
            let value: i32 = row
                .iter()
                .zip(block.iter())
                .map(|(m, c)| m * alpha_val(*c))
                .sum();
            out.push((b'A' + hill_mod(value) as u8) as char);
        }
    }
    out
}

fn hill_process(text: &str, key: &str, size: &str) -> String {
    format!(
        "加密: {}\n解密: {}",
        hill_run(text, key, size, false),
        hill_run(text, key, size, true)
    )
}

fn md5_digest(input: &[u8]) -> [u8; 16] {
    const S: [u32; 64] = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14,
        20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
        16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ];
    const K: [u32; 64] = [
        0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613,
        0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193,
        0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d,
        0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
        0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122,
        0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
        0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244,
        0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
        0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb,
        0xeb86d391,
    ];
    let mut message = input.to_vec();
    let bit_len = (message.len() as u64) * 8;
    message.push(0x80);
    while message.len() % 64 != 56 {
        message.push(0);
    }
    message.extend_from_slice(&bit_len.to_le_bytes());

    let mut a0 = 0x67452301u32;
    let mut b0 = 0xefcdab89u32;
    let mut c0 = 0x98badcfeu32;
    let mut d0 = 0x10325476u32;

    for chunk in message.chunks(64) {
        let mut m = [0u32; 16];
        for (index, word) in m.iter_mut().enumerate() {
            let start = index * 4;
            *word = u32::from_le_bytes([
                chunk[start],
                chunk[start + 1],
                chunk[start + 2],
                chunk[start + 3],
            ]);
        }
        let mut a = a0;
        let mut b = b0;
        let mut c = c0;
        let mut d = d0;
        for i in 0..64 {
            let (f, g) = if i < 16 {
                ((b & c) | ((!b) & d), i)
            } else if i < 32 {
                ((d & b) | ((!d) & c), (5 * i + 1) % 16)
            } else if i < 48 {
                (b ^ c ^ d, (3 * i + 5) % 16)
            } else {
                (c ^ (b | !d), (7 * i) % 16)
            };
            let temp = d;
            d = c;
            c = b;
            b = b.wrapping_add(
                a.wrapping_add(f)
                    .wrapping_add(K[i])
                    .wrapping_add(m[g])
                    .rotate_left(S[i]),
            );
            a = temp;
        }
        a0 = a0.wrapping_add(a);
        b0 = b0.wrapping_add(b);
        c0 = c0.wrapping_add(c);
        d0 = d0.wrapping_add(d);
    }
    let mut out = [0u8; 16];
    out[0..4].copy_from_slice(&a0.to_le_bytes());
    out[4..8].copy_from_slice(&b0.to_le_bytes());
    out[8..12].copy_from_slice(&c0.to_le_bytes());
    out[12..16].copy_from_slice(&d0.to_le_bytes());
    out
}

fn md5_hmac_result(key_hex: &str, message: &str) -> String {
    let filtered: String = key_hex.chars().filter(|c| !c.is_whitespace()).collect();
    if filtered.is_empty() || !filtered.chars().all(|c| c.is_ascii_hexdigit()) {
        return "请输入正确的16进制".to_string();
    }
    let mut key = Vec::new();
    let chars: Vec<char> = filtered.chars().collect();
    for chunk in chars.chunks(2) {
        let mut byte = chunk.iter().collect::<String>();
        if byte.len() == 1 {
            byte.push('0');
        }
        if let Ok(value) = u8::from_str_radix(&byte, 16) {
            key.push(value);
        }
    }
    hex_lower(&hmac_with_hash(&key, message.as_bytes(), 64, |bytes| md5_digest(bytes).to_vec()))
}

fn hmac_with_hash(
    key: &[u8],
    message: &[u8],
    block_size: usize,
    hash: impl Fn(&[u8]) -> Vec<u8>,
) -> Vec<u8> {
    let mut key = if key.len() > block_size {
        hash(key)
    } else {
        key.to_vec()
    };
    key.resize(block_size, 0);
    let inner: Vec<u8> = key.iter().map(|b| b ^ 0x36).collect();
    let outer: Vec<u8> = key.iter().map(|b| b ^ 0x5c).collect();
    let mut inner_input = inner;
    inner_input.extend_from_slice(message);
    let inner_hash = hash(&inner_input);
    let mut outer_input = outer;
    outer_input.extend_from_slice(&inner_hash);
    hash(&outer_input)
}

fn hex_lower(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn sha_key_bytes(key: &str) -> Vec<u8> {
    let clean: String = key.chars().filter(|c| !c.is_whitespace()).collect();
    if !clean.is_empty()
        && clean.len() % 2 == 0
        && key.chars().all(|c| c.is_ascii_hexdigit() || c.is_whitespace())
    {
        (0..clean.len())
            .step_by(2)
            .filter_map(|index| u8::from_str_radix(&clean[index..index + 2], 16).ok())
            .collect()
    } else {
        key.as_bytes().to_vec()
    }
}

fn update_sha_results(text: String) {
    let sha1_key = value_by_id("SHA1Key", "");
    let sha256_key = value_by_id("SHA256Key", "");
    let sha384_key = value_by_id("SHA384Key", "");
    let sha512_key = value_by_id("SHA512Key", "");
    let sequence = MODERN_HASH_SEQUENCE.with(|seq| {
        let next = seq.get().wrapping_add(1);
        seq.set(next);
        next
    });
    spawn_local(async move {
        let sha1 = sha_result_text("SHA-1", &text, &sha1_key).await;
        let sha256 = sha_result_text("SHA-256", &text, &sha256_key).await;
        let sha384 = sha_result_text("SHA-384", &text, &sha384_key).await;
        let sha512 = sha_result_text("SHA-512", &text, &sha512_key).await;
        let still_current = MODERN_HASH_SEQUENCE.with(|seq| seq.get() == sequence);
        if still_current {
            set_text("SHA1Result", &sha1);
            set_text("SHA256Result", &sha256);
            set_text("SHA384Result", &sha384);
            set_text("SHA512Result", &sha512);
        }
    });
}

async fn sha_result_text(algorithm: &str, text: &str, key: &str) -> String {
    let digest = web_crypto_digest_hex(algorithm, text.as_bytes())
        .await
        .unwrap_or_else(|err| err);
    if key.trim().is_empty() {
        format!("结果: {digest}")
    } else {
        let key_bytes = sha_key_bytes(key);
        let hmac = web_crypto_hmac_hex(algorithm, &key_bytes, text.as_bytes())
            .await
            .unwrap_or_else(|err| err);
        format!("结果: {digest}\nHMAC结果: {hmac}")
    }
}

async fn web_crypto_digest_hex(algorithm: &str, bytes: &[u8]) -> Result<String, String> {
    let subtle = web_crypto_subtle()?;
    let func: Function = Reflect::get(&subtle, &JsValue::from_str("digest"))
        .map_err(|_| "无效字符".to_string())?
        .dyn_into()
        .map_err(|_| "无效字符".to_string())?;
    let data = Uint8Array::from(bytes);
    let args = Array::new();
    args.push(&JsValue::from_str(algorithm));
    args.push(data.as_ref());
    let promise: Promise = Reflect::apply(&func, &subtle, &args)
        .map_err(|_| "无效字符".to_string())?
        .dyn_into()
        .map_err(|_| "无效字符".to_string())?;
    let result = JsFuture::from(promise)
        .await
        .map_err(|_| "无效字符".to_string())?;
    Ok(hex_lower(&Uint8Array::new(&result).to_vec()))
}

async fn web_crypto_hmac_hex(algorithm: &str, key: &[u8], message: &[u8]) -> Result<String, String> {
    let subtle = web_crypto_subtle()?;
    let import_key: Function = Reflect::get(&subtle, &JsValue::from_str("importKey"))
        .map_err(|_| "无效字符".to_string())?
        .dyn_into()
        .map_err(|_| "无效字符".to_string())?;
    let sign: Function = Reflect::get(&subtle, &JsValue::from_str("sign"))
        .map_err(|_| "无效字符".to_string())?
        .dyn_into()
        .map_err(|_| "无效字符".to_string())?;

    let hash = Object::new();
    Reflect::set(hash.as_ref(), &JsValue::from_str("name"), &JsValue::from_str(algorithm))
        .map_err(|_| "无效字符".to_string())?;
    let algo = Object::new();
    Reflect::set(algo.as_ref(), &JsValue::from_str("name"), &JsValue::from_str("HMAC"))
        .map_err(|_| "无效字符".to_string())?;
    Reflect::set(algo.as_ref(), &JsValue::from_str("hash"), hash.as_ref())
        .map_err(|_| "无效字符".to_string())?;
    let usages = Array::new();
    usages.push(&JsValue::from_str("sign"));
    let key_data = Uint8Array::from(key);
    let import_args = Array::new();
    import_args.push(&JsValue::from_str("raw"));
    import_args.push(key_data.as_ref());
    import_args.push(algo.as_ref());
    import_args.push(&JsValue::FALSE);
    import_args.push(usages.as_ref());
    let key_promise: Promise = Reflect::apply(&import_key, &subtle, &import_args)
        .map_err(|_| "无效字符".to_string())?
        .dyn_into()
        .map_err(|_| "无效字符".to_string())?;
    let crypto_key = JsFuture::from(key_promise)
        .await
        .map_err(|_| "无效字符".to_string())?;

    let message_data = Uint8Array::from(message);
    let sign_args = Array::new();
    sign_args.push(algo.as_ref());
    sign_args.push(&crypto_key);
    sign_args.push(message_data.as_ref());
    let sign_promise: Promise = Reflect::apply(&sign, &subtle, &sign_args)
        .map_err(|_| "无效字符".to_string())?
        .dyn_into()
        .map_err(|_| "无效字符".to_string())?;
    let signature = JsFuture::from(sign_promise)
        .await
        .map_err(|_| "无效字符".to_string())?;
    Ok(hex_lower(&Uint8Array::new(&signature).to_vec()))
}

fn web_crypto_subtle() -> Result<JsValue, String> {
    let crypto = Reflect::get(window().map_err(|_| "无效字符".to_string())?.as_ref(), &JsValue::from_str("crypto"))
        .map_err(|_| "无效字符".to_string())?;
    Reflect::get(&crypto, &JsValue::from_str("subtle")).map_err(|_| "无效字符".to_string())
}

#[derive(Clone)]
struct EnigmaSlot {
    rotors: &'static [&'static str],
    rotating: bool,
}

#[derive(Clone)]
struct EnigmaModel {
    name: &'static str,
    label: &'static str,
    description: Option<&'static str>,
    character_group_size: usize,
    plugboard: bool,
    entry_rotor: &'static str,
    reflector_rotors: &'static [&'static str],
    reflector_thumbwheel: bool,
    reflector_rotating: bool,
    turnover_mechanism: Option<&'static str>,
    slots: Vec<EnigmaSlot>,
}

#[derive(Clone)]
struct EnigmaRotor {
    name: &'static str,
    label: &'static str,
    wiring: &'static str,
    turnovers: &'static str,
}

const ENIGMA_ROTORS: &[EnigmaRotor] = &[
    EnigmaRotor { name: "ETW-ABCDEF", label: "Alphabet", wiring: "abcdefghijklmnopqrstuvwxyz", turnovers: "" },
    EnigmaRotor { name: "ETW-QWERTZ", label: "Keyboard", wiring: "jwulcmnohpqzyxiradkegvbtsf", turnovers: "" },
    EnigmaRotor { name: "I", label: "I", wiring: "ekmflgdqvzntowyhxuspaibrcj", turnovers: "q" },
    EnigmaRotor { name: "II", label: "II", wiring: "ajdksiruxblhwtmcqgznpyfvoe", turnovers: "e" },
    EnigmaRotor { name: "III", label: "III", wiring: "bdfhjlcprtxvznyeiwgakmusqo", turnovers: "v" },
    EnigmaRotor { name: "IV", label: "IV", wiring: "esovpzjayquirhxlnftgkdcmwb", turnovers: "j" },
    EnigmaRotor { name: "V", label: "V", wiring: "vzbrgityupsdnhlxawmjqofeck", turnovers: "z" },
    EnigmaRotor { name: "VI", label: "VI", wiring: "jpgvoumfyqbenhzrdkasxlictw", turnovers: "zm" },
    EnigmaRotor { name: "VII", label: "VII", wiring: "nzjhgrcxmyswboufaivlpekqdt", turnovers: "zm" },
    EnigmaRotor { name: "VIII", label: "VIII", wiring: "fkqhtlxocbjspdzramewniuygv", turnovers: "zm" },
    EnigmaRotor { name: "beta", label: "Beta", wiring: "leyjvcnixwpbqmdrtakzgfuhos", turnovers: "" },
    EnigmaRotor { name: "gamma", label: "Gamma", wiring: "fsokanuerhmbtiycwlqpzxvgjd", turnovers: "" },
    EnigmaRotor { name: "UKW-A", label: "UKW A", wiring: "ejmzalyxvbwfcrquontspikhgd", turnovers: "" },
    EnigmaRotor { name: "UKW-B", label: "UKW B", wiring: "yruhqsldpxngokmiebfzcwvjat", turnovers: "" },
    EnigmaRotor { name: "UKW-C", label: "UKW C", wiring: "fvpjiaoyedrzxwgctkuqsbnmhl", turnovers: "" },
    EnigmaRotor { name: "UKW-B-thin", label: "UKW B thin", wiring: "enkqauywjicopblmdxzvfthrgs", turnovers: "" },
    EnigmaRotor { name: "UKW-C-thin", label: "UKW C thin", wiring: "rdobjntkvehmlfcwzaxgyipsuq", turnovers: "" },
    EnigmaRotor { name: "I-N", label: "I", wiring: "wtokasuyvrbxjhqcpzefmdinlg", turnovers: "q" },
    EnigmaRotor { name: "II-N", label: "II", wiring: "gjlpubswemctqvhxaofzdrkyni", turnovers: "e" },
    EnigmaRotor { name: "III-N", label: "III", wiring: "jwfmhnbpusdytixvzgrqlaoekc", turnovers: "v" },
    EnigmaRotor { name: "IV-N", label: "IV", wiring: "fgzjmvxepbwshqtliudykcnrao", turnovers: "j" },
    EnigmaRotor { name: "V-N", label: "V", wiring: "hejxqotzbvfdascilwpgynmurk", turnovers: "z" },
    EnigmaRotor { name: "UKW-N", label: "UKW", wiring: "mowjypuxndsraibfvlkzgqchet", turnovers: "" },
    EnigmaRotor { name: "I-S", label: "I", wiring: "veosirzujdqckgwypnxaflthmb", turnovers: "q" },
    EnigmaRotor { name: "II-S", label: "II", wiring: "uemoatqlshpkcyfwjzbgvxidnr", turnovers: "e" },
    EnigmaRotor { name: "III-S", label: "III", wiring: "tzhxmbsipnurjfdkeqvcwglaoy", turnovers: "v" },
    EnigmaRotor { name: "UKW-S", label: "UKW", wiring: "ciagsndrbytpzfulvhekoqxwjm", turnovers: "" },
    EnigmaRotor { name: "I-D", label: "I", wiring: "lpgszmhaeoqkvxrfybutnicjdw", turnovers: "y" },
    EnigmaRotor { name: "II-D", label: "II", wiring: "slvgbtfxjqohewirzyamkpcndu", turnovers: "e" },
    EnigmaRotor { name: "III-D", label: "III", wiring: "cjgdpshkturawzxfmynqobvlie", turnovers: "n" },
    EnigmaRotor { name: "UKW-COM", label: "UKW", wiring: "imetcgfraysqbzxwlhkdvupojn", turnovers: "" },
    EnigmaRotor { name: "ETW-T", label: "ETW", wiring: "ilxrztkgjyamwvdufcpqeonshb", turnovers: "" },
    EnigmaRotor { name: "I-T", label: "I", wiring: "kptyuelocvgrfqdanjmbswhzxi", turnovers: "wzekq" },
    EnigmaRotor { name: "II-T", label: "II", wiring: "uphzlweqmtdjxcaksoigvbyfnr", turnovers: "wzflr" },
    EnigmaRotor { name: "III-T", label: "III", wiring: "qudlyrfekonvzaxwhmgpjbsict", turnovers: "wzekq" },
    EnigmaRotor { name: "IV-T", label: "IV", wiring: "ciwtbkxnrespflydagvhquojzm", turnovers: "wzflr" },
    EnigmaRotor { name: "V-T", label: "V", wiring: "uaxgisnjbverdylfzwtpckohmq", turnovers: "ycfkr" },
    EnigmaRotor { name: "VI-T", label: "VI", wiring: "xfuzgalvhcnysewqtdmrbkpioj", turnovers: "xeimq" },
    EnigmaRotor { name: "VII-T", label: "VII", wiring: "bjvftxplnayozikwgdqeruchsm", turnovers: "ycfkr" },
    EnigmaRotor { name: "VIII-T", label: "VIII", wiring: "ymtpnzhwkodajxeluqvgcbisfr", turnovers: "xeimq" },
    EnigmaRotor { name: "UKW-T", label: "UKW", wiring: "gekpbtaumocniljdxzyfhwvqsr", turnovers: "" },
    EnigmaRotor { name: "I-KS", label: "I", wiring: "pezuohxscvfmtbglrinqjwaydk", turnovers: "y" },
    EnigmaRotor { name: "II-KS", label: "II", wiring: "zouesydkfwpciqxhmvblgnjrat", turnovers: "e" },
    EnigmaRotor { name: "III-KS", label: "III", wiring: "ehrvxgaobqusimzflynwktpdjc", turnovers: "n" },
    EnigmaRotor { name: "I-KR", label: "I", wiring: "jgdqoxuscamifrvtpnewkblzyh", turnovers: "n" },
    EnigmaRotor { name: "II-KR", label: "II", wiring: "ntzpsfbokmwrcjdivlaeyuxhgq", turnovers: "e" },
    EnigmaRotor { name: "III-KR", label: "III", wiring: "jviubhtcdyakeqzposgxnrmwfl", turnovers: "y" },
    EnigmaRotor { name: "UKW-KR", label: "UKW", wiring: "qyhognecvpuztfdjaxwmkisrbl", turnovers: "" },
    EnigmaRotor { name: "I-Z", label: "I", wiring: "lpgszmhaeoqkvxrfybutnicjdw", turnovers: "suvwzabcefgiklopq" },
    EnigmaRotor { name: "II-Z", label: "II", wiring: "slvgbtfxjqohewirzyamkpcndu", turnovers: "stvyzacdfghkmnq" },
    EnigmaRotor { name: "III-Z", label: "III", wiring: "cjgdpshkturawzxfmynqobvlie", turnovers: "uwxaefhkmnr" },
    EnigmaRotor { name: "I-G111", label: "I", wiring: "wlrhbqundkjczsexotmagyfpvi", turnovers: "suvwzabcefgiklopq" },
    EnigmaRotor { name: "II-G111", label: "II", wiring: "tfjqazwmhlcuixrdygoevbnskp", turnovers: "stvyzacdfghkmnq" },
    EnigmaRotor { name: "V-G111", label: "V", wiring: "qtpixwvdfrmusljohcanezkybg", turnovers: "swzfhmq" },
    EnigmaRotor { name: "I-G312", label: "I", wiring: "dmtwsilruyqnkfejcazbpgxohv", turnovers: "suvwzabcefgiklopq" },
    EnigmaRotor { name: "II-G312", label: "II", wiring: "hqzgpjtmoblncifdyawveusrkx", turnovers: "stvyzacdfghkmnq" },
    EnigmaRotor { name: "III-G312", label: "III", wiring: "uqntlszfmrehdpxkibvygjcwoa", turnovers: "uwxaefhkmnr" },
    EnigmaRotor { name: "UKW-G312", label: "UKW", wiring: "rulqmzjsygocetkwdahnbxpvif", turnovers: "" },
    EnigmaRotor { name: "I-G260", label: "I", wiring: "rcspblkqaumhwytifzvgojnexd", turnovers: "suvwzabcefgiklopq" },
    EnigmaRotor { name: "II-G260", label: "II", wiring: "wcmibvpjxarosgndlzkeyhufqt", turnovers: "stvyzacdfghkmnq" },
    EnigmaRotor { name: "III-G260", label: "III", wiring: "fvdhzelsqmaxokyiwpgcbujtnr", turnovers: "uwxaefhkmnr" },
];

fn slot(rotors: &'static [&'static str]) -> EnigmaSlot {
    EnigmaSlot { rotors, rotating: true }
}

fn fixed_slot(rotors: &'static [&'static str]) -> EnigmaSlot {
    EnigmaSlot { rotors, rotating: false }
}

fn enigma_models() -> Vec<EnigmaModel> {
    vec![
        EnigmaModel { name: "I", label: "Enigma I", description: Some("German Army & Air Force"), character_group_size: 5, plugboard: true, entry_rotor: "ETW-ABCDEF", reflector_rotors: &["UKW-A", "UKW-B", "UKW-C"], reflector_thumbwheel: false, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I", "II", "III", "IV", "V"]), slot(&["I", "II", "III", "IV", "V"]), slot(&["I", "II", "III", "IV", "V"])] },
        EnigmaModel { name: "N", label: "Enigma I \"Norenigma\"", description: Some("Norwegian Police Security Service"), character_group_size: 5, plugboard: true, entry_rotor: "ETW-ABCDEF", reflector_rotors: &["UKW-N"], reflector_thumbwheel: false, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I-N", "II-N", "III-N", "IV-N", "V-N"]), slot(&["I-N", "II-N", "III-N", "IV-N", "V-N"]), slot(&["I-N", "II-N", "III-N", "IV-N", "V-N"])] },
        EnigmaModel { name: "S", label: "Enigma I \"Sondermaschine\"", description: Some("German Intelligence"), character_group_size: 5, plugboard: true, entry_rotor: "ETW-ABCDEF", reflector_rotors: &["UKW-S"], reflector_thumbwheel: false, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I-S", "II-S", "III-S"]), slot(&["I-S", "II-S", "III-S"]), slot(&["I-S", "II-S", "III-S"])] },
        EnigmaModel { name: "M3", label: "Enigma M3", description: Some("German Army & Navy"), character_group_size: 5, plugboard: true, entry_rotor: "ETW-ABCDEF", reflector_rotors: &["UKW-B", "UKW-C"], reflector_thumbwheel: false, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]), slot(&["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]), slot(&["I", "II", "III", "IV", "V", "VI", "VII", "VIII"])] },
        EnigmaModel { name: "M4", label: "Enigma M4 \"Shark\"", description: Some("German Submarines"), character_group_size: 4, plugboard: true, entry_rotor: "ETW-ABCDEF", reflector_rotors: &["UKW-B-thin", "UKW-C-thin"], reflector_thumbwheel: false, reflector_rotating: false, turnover_mechanism: None, slots: vec![fixed_slot(&["beta", "gamma"]), slot(&["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]), slot(&["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]), slot(&["I", "II", "III", "IV", "V", "VI", "VII", "VIII"])] },
        EnigmaModel { name: "D", label: "Enigma D / K", description: Some("Commercial Enigma"), character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-COM"], reflector_thumbwheel: true, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I-D", "II-D", "III-D"]), slot(&["I-D", "II-D", "III-D"]), slot(&["I-D", "II-D", "III-D"])] },
        EnigmaModel { name: "T", label: "Enigma T \"Tirpitz\"", description: Some("Japanese Army"), character_group_size: 5, plugboard: false, entry_rotor: "ETW-T", reflector_rotors: &["UKW-T"], reflector_thumbwheel: true, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I-T", "II-T", "III-T", "IV-T", "V-T", "VI-T", "VII-T", "VIII-T"]), slot(&["I-T", "II-T", "III-T", "IV-T", "V-T", "VI-T", "VII-T", "VIII-T"]), slot(&["I-T", "II-T", "III-T", "IV-T", "V-T", "VI-T", "VII-T", "VIII-T"])] },
        EnigmaModel { name: "KS", label: "Swiss-K", description: Some("Swiss Army & Air Force"), character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-COM"], reflector_thumbwheel: true, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I-KS", "II-KS", "III-KS"]), slot(&["I-KS", "II-KS", "III-KS"]), slot(&["I-KS", "II-KS", "III-KS"])] },
        EnigmaModel { name: "KR", label: "Railway Enigma \"Rocket I\"", description: Some("German Railway"), character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-KR"], reflector_thumbwheel: true, reflector_rotating: false, turnover_mechanism: None, slots: vec![slot(&["I-KR", "II-KR", "III-KR"]), slot(&["I-KR", "II-KR", "III-KR"]), slot(&["I-KR", "II-KR", "III-KR"])] },
        EnigmaModel { name: "Z", label: "Zählwerk Enigma A-865", description: None, character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-COM"], reflector_thumbwheel: true, reflector_rotating: true, turnover_mechanism: Some("cog"), slots: vec![slot(&["I-Z", "II-Z", "III-Z"]), slot(&["I-Z", "II-Z", "III-Z"]), slot(&["I-Z", "II-Z", "III-Z"])] },
        EnigmaModel { name: "G111", label: "Abwehr Enigma G-111", description: None, character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-COM"], reflector_thumbwheel: true, reflector_rotating: true, turnover_mechanism: Some("cog"), slots: vec![slot(&["I-G111", "II-G111", "V-G111"]), slot(&["I-G111", "II-G111", "V-G111"]), slot(&["I-G111", "II-G111", "V-G111"])] },
        EnigmaModel { name: "G312", label: "Abwehr Enigma G-312", description: Some("German Seret Service"), character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-G312"], reflector_thumbwheel: true, reflector_rotating: true, turnover_mechanism: Some("cog"), slots: vec![slot(&["I-G312", "II-G312", "III-G312"]), slot(&["I-G312", "II-G312", "III-G312"]), slot(&["I-G312", "II-G312", "III-G312"])] },
        EnigmaModel { name: "G260", label: "Abwehr Enigma G-260", description: Some("German Seret Service in Argentina"), character_group_size: 5, plugboard: false, entry_rotor: "ETW-QWERTZ", reflector_rotors: &["UKW-COM"], reflector_thumbwheel: true, reflector_rotating: true, turnover_mechanism: Some("cog"), slots: vec![slot(&["I-G260", "II-G260", "III-G260"]), slot(&["I-G260", "II-G260", "III-G260"]), slot(&["I-G260", "II-G260", "III-G260"])] },
    ]
}

fn enigma_model(name: &str) -> Option<EnigmaModel> {
    enigma_models().into_iter().find(|model| model.name == name)
}

fn enigma_rotor(name: &str) -> Option<EnigmaRotor> {
    ENIGMA_ROTORS.iter().find(|rotor| rotor.name == name).cloned()
}

fn init_enigma_ui() -> Result<(), JsValue> {
    let document = document()?;
    let Some(model_select) = document.get_element_by_id("enigmaModel") else {
        return Ok(());
    };
    if model_select.get_attribute("data-rust-enigma-bound").as_deref() == Some("1") {
        return Ok(());
    }
    model_select.set_attribute("data-rust-enigma-bound", "1")?;
    model_select.set_inner_html("");
    for model in enigma_models() {
        let option = document.create_element("option")?;
        option.set_attribute("value", model.name)?;
        option.set_text_content(Some(&format!(
            "{}{}",
            model.label,
            model.description.map(|d| format!(" - {d}")).unwrap_or_default()
        )));
        model_select.append_child(&option)?;
    }
    let change = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Err(err) = update_enigma_layout() {
            console::error_1(&err);
        }
    }));
    model_select.add_event_listener_with_callback("change", change.as_ref().unchecked_ref())?;
    change.forget();

    if let Some(input) = document.query_selector("#xiandaiqu #mainInput")? {
        let input_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            process_enigma();
        }));
        input.add_event_listener_with_callback("input", input_closure.as_ref().unchecked_ref())?;
        input_closure.forget();
    }
    if let Some(plugboard) = document.get_element_by_id("Plugboard") {
        let plugboard_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            process_enigma();
        }));
        plugboard.add_event_listener_with_callback("input", plugboard_closure.as_ref().unchecked_ref())?;
        plugboard_closure.forget();
    }
    update_enigma_layout()
}

fn update_enigma_layout() -> Result<(), JsValue> {
    let document = document()?;
    let Some(model_select) = document.get_element_by_id("enigmaModel") else {
        return Ok(());
    };
    let Some(rotor_settings) = document.get_element_by_id("rotorSettings") else {
        return Ok(());
    };
    let Some(plugboard_input) = document.get_element_by_id("Plugboard") else {
        return Ok(());
    };
    let model_name = element_value(&model_select);
    let Some(model) = enigma_model(if model_name.is_empty() { "M3" } else { &model_name }) else {
        return Ok(());
    };
    rotor_settings.set_inner_html("");

    let reflector_rotors: Vec<EnigmaRotor> = model
        .reflector_rotors
        .iter()
        .filter_map(|name| enigma_rotor(name))
        .collect();
    let reflector_row = document.create_element("div")?;
    reflector_row.set_class_name("grid-full2");
    if reflector_rotors.len() > 1 || model.reflector_thumbwheel {
        let reflector_select = document.create_element("select")?;
        reflector_select.set_id("enigmaReflector");
        for rotor in &reflector_rotors {
            let option = document.create_element("option")?;
            option.set_attribute("value", rotor.name)?;
            option.set_text_content(Some(rotor.label));
            reflector_select.append_child(&option)?;
        }
        bind_process_enigma(&reflector_select, "change")?;
        reflector_row.append_child(&reflector_select)?;
    }
    if model.reflector_thumbwheel {
        append_inline_label(&reflector_row, " 位置: ")?;
        let position = number_input("reflectorPosition", "位置", 1, 26, 1)?;
        bind_process_enigma(&position, "input")?;
        reflector_row.append_child(&position)?;
        append_inline_label(&reflector_row, " 环设置: ")?;
        let ring = number_input("reflectorRing", "环设置", 1, 26, 1)?;
        bind_process_enigma(&ring, "input")?;
        reflector_row.append_child(&ring)?;
    }
    rotor_settings.append_child(&reflector_row)?;

    for (index, slot) in model.slots.iter().enumerate() {
        let rotor_container = document.create_element("div")?;
        rotor_container.set_class_name("grid-3");
        let rotor_col = document.create_element("div")?;
        append_inline_label(&rotor_col, &format!("转子{}: ", index + 1))?;
        let rotor_select = document.create_element("select")?;
        rotor_select.set_id(&format!("enigmaRotor{}", index + 1));
        for rotor_name in slot.rotors {
            if let Some(rotor) = enigma_rotor(rotor_name) {
                let option = document.create_element("option")?;
                option.set_attribute("value", rotor.name)?;
                option.set_text_content(Some(rotor.label));
                rotor_select.append_child(&option)?;
            }
        }
        bind_process_enigma(&rotor_select, "change")?;
        rotor_col.append_child(&rotor_select)?;

        let position_col = document.create_element("div")?;
        append_inline_label(&position_col, "位置: ")?;
        let position = number_input(&format!("rotor{}Position", index + 1), "位置", 1, 26, 1)?;
        bind_process_enigma(&position, "input")?;
        position_col.append_child(&position)?;

        let ring_col = document.create_element("div")?;
        append_inline_label(&ring_col, "环设置: ")?;
        let ring = number_input(&format!("rotor{}Ring", index + 1), "环设置", 1, 26, 1)?;
        bind_process_enigma(&ring, "input")?;
        ring_col.append_child(&ring)?;

        rotor_container.append_child(&rotor_col)?;
        rotor_container.append_child(&position_col)?;
        rotor_container.append_child(&ring_col)?;
        rotor_settings.append_child(&rotor_container)?;
    }
    if let Some(parent) = plugboard_input.parent_element() {
        set_display(&parent, if model.plugboard { "" } else { "none" });
    }
    process_enigma();
    Ok(())
}

fn inline_label(text: &str) -> Result<Element, JsValue> {
    let span = document()?.create_element("span")?;
    span.set_text_content(Some(text));
    Ok(span)
}

fn append_inline_label(parent: &Element, text: &str) -> Result<(), JsValue> {
    let label = inline_label(text)?;
    parent.append_child(&label)?;
    Ok(())
}

fn number_input(id: &str, placeholder: &str, min: i32, max: i32, value: i32) -> Result<Element, JsValue> {
    let input = document()?.create_element("input")?;
    input.set_attribute("type", "number")?;
    input.set_id(id);
    input.set_attribute("min", &min.to_string())?;
    input.set_attribute("max", &max.to_string())?;
    input.set_attribute("value", &value.to_string())?;
    input.set_attribute("placeholder", placeholder)?;
    Ok(input)
}

fn bind_process_enigma(element: &Element, event_name: &str) -> Result<(), JsValue> {
    let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        process_enigma();
    }));
    element.add_event_listener_with_callback(event_name, closure.as_ref().unchecked_ref())?;
    closure.forget();
    Ok(())
}

fn process_enigma() {
    let input = query_value("#xiandaiqu #mainInput").unwrap_or_default().to_lowercase();
    if input.is_empty() {
        set_text("EnigmaResult", "");
        return;
    }
    let model_name = value_by_id("enigmaModel", "M3");
    let Some(model) = enigma_model(if model_name.is_empty() { "M3" } else { &model_name }) else {
        return;
    };
    let reflector = value_by_id(
        "enigmaReflector",
        model.reflector_rotors.first().copied().unwrap_or("UKW-B"),
    );
    let reflector_position = int_value("reflectorPosition", 1).clamp(1, 26);
    let reflector_ring = int_value("reflectorRing", 1).clamp(1, 26);
    let mut rotors = Vec::new();
    let mut positions = Vec::new();
    let mut rings = Vec::new();
    for (index, slot) in model.slots.iter().enumerate() {
        let fallback = slot.rotors.first().copied().unwrap_or("I");
        let rotor_name = value_by_id(&format!("enigmaRotor{}", index + 1), fallback);
        rotors.push(rotor_name);
        positions.push(int_value(&format!("rotor{}Position", index + 1), 1).clamp(1, 26));
        rings.push(int_value(&format!("rotor{}Ring", index + 1), 1).clamp(1, 26));
    }
    let plugboard = if model.plugboard {
        value_by_id("Plugboard", "")
    } else {
        String::new()
    };
    let output = enigma_translate(
        &input,
        &model,
        &reflector,
        reflector_position,
        reflector_ring,
        &rotors,
        &positions,
        &rings,
        &plugboard,
        true,
    );
    set_text("EnigmaResult", &format!("加密结果: {output}"));
}

#[allow(clippy::too_many_arguments)]
fn enigma_translate(
    content: &str,
    model: &EnigmaModel,
    reflector_name: &str,
    reflector_position: i32,
    reflector_ring: i32,
    rotor_names: &[String],
    rotor_positions: &[i32],
    rotor_rings: &[i32],
    plugboard_setting: &str,
    include_foreign: bool,
) -> String {
    let slot_count = model.slots.len();
    let slot_rotating: Vec<bool> = model.slots.iter().map(|slot| slot.rotating).collect();
    let rotors: Vec<EnigmaRotor> = rotor_names
        .iter()
        .filter_map(|name| enigma_rotor(name))
        .collect();
    let mut positions: Vec<i32> = rotor_positions.iter().map(|v| v - 1).collect();
    let rings: Vec<i32> = rotor_rings.iter().map(|v| v - 1).collect();
    let Some(entry_rotor) = enigma_rotor(model.entry_rotor) else {
        return String::new();
    };
    let Some(reflector_rotor) = enigma_rotor(reflector_name) else {
        return String::new();
    };
    let mut reflector_position = if model.reflector_thumbwheel {
        reflector_position - 1
    } else {
        0
    };
    let reflector_ring = if model.reflector_thumbwheel { reflector_ring - 1 } else { 0 };
    let plugboard = model
        .plugboard
        .then(|| enigma_plugboard_wiring(plugboard_setting));
    let mut output = Vec::new();

    for c in content.chars() {
        let mut char_index = if c.is_ascii_uppercase() {
            c as i32 - 'A' as i32
        } else if c.is_ascii_lowercase() {
            c as i32 - 'a' as i32
        } else if include_foreign {
            output.push(c);
            continue;
        } else {
            continue;
        };

        let mut step_rotors = vec![false; slot_count];
        let mut step_reflector = false;
        if model.turnover_mechanism == Some("cog") {
            let mut turnover = true;
            let mut index = slot_count;
            while turnover && index > 0 {
                index -= 1;
                if slot_rotating[index] {
                    turnover = enigma_rotor_at_turnover(&rotors[index], positions[index]);
                    step_rotors[index] = true;
                } else {
                    turnover = false;
                }
            }
            step_reflector = model.reflector_rotating && turnover;
        } else {
            for index in 0..slot_count {
                if slot_rotating[index]
                    && ((model.reflector_rotating && index == 0)
                        || (index > 0 && slot_rotating[index - 1]))
                    && enigma_rotor_at_turnover(&rotors[index], positions[index])
                {
                    step_rotors[index] = true;
                    if index > 0 {
                        step_rotors[index - 1] = true;
                    } else {
                        step_reflector = true;
                    }
                }
            }
            if slot_count > 0 {
                step_rotors[slot_count - 1] = slot_rotating[slot_count - 1];
            }
        }
        for index in 0..slot_count {
            if step_rotors[index] {
                positions[index] = (positions[index] + 1).rem_euclid(26);
            }
        }
        if step_reflector {
            reflector_position = (reflector_position + 1).rem_euclid(26);
        }
        if let Some(plugboard) = &plugboard {
            char_index = enigma_rotor_map_char(char_index, plugboard, 0, 0, false);
        }
        char_index = enigma_rotor_map_char(char_index, entry_rotor.wiring, 0, 0, false);
        for index in (0..rotors.len()).rev() {
            char_index = enigma_rotor_map_char(char_index, rotors[index].wiring, positions[index], rings[index], false);
        }
        char_index = enigma_rotor_map_char(char_index, reflector_rotor.wiring, reflector_position, reflector_ring, false);
        for index in 0..rotors.len() {
            char_index = enigma_rotor_map_char(char_index, rotors[index].wiring, positions[index], rings[index], true);
        }
        char_index = enigma_rotor_map_char(char_index, entry_rotor.wiring, 0, 0, true);
        if let Some(plugboard) = &plugboard {
            char_index = enigma_rotor_map_char(char_index, plugboard, 0, 0, true);
        }
        output.push((b'a' + char_index as u8) as char);
    }

    if include_foreign {
        output.into_iter().collect()
    } else {
        let mut grouped = String::new();
        for ch in output {
            if (grouped.len() + 1) % (model.character_group_size + 1) == 0 {
                grouped.push(' ');
            }
            grouped.push(ch);
        }
        grouped
    }
}

fn enigma_rotor_at_turnover(rotor: &EnigmaRotor, position: i32) -> bool {
    if rotor.turnovers.is_empty() {
        return false;
    }
    let position_char = (b'a' + position.rem_euclid(26) as u8) as char;
    rotor.turnovers.contains(position_char)
}

fn enigma_rotor_map_char(
    char_index: i32,
    wiring: &str,
    position: i32,
    ring_setting: i32,
    inverted: bool,
) -> i32 {
    let position = (position - ring_setting).rem_euclid(26);
    let shifted = (char_index + position).rem_euclid(26);
    let mapped = if !inverted {
        wiring.as_bytes()[shifted as usize] as i32 - 'a' as i32
    } else {
        let needle = (b'a' + shifted as u8) as char;
        wiring.find(needle).unwrap_or(shifted as usize) as i32
    };
    (mapped - position).rem_euclid(26)
}

fn enigma_plugboard_wiring(setting: &str) -> String {
    let mut wiring: Vec<char> = "abcdefghijklmnopqrstuvwxyz".chars().collect();
    for pair in setting.to_lowercase().split_whitespace() {
        let chars: Vec<char> = pair.chars().filter(|c| c.is_ascii_lowercase()).collect();
        if chars.len() != 2 {
            continue;
        }
        let a = chars[0] as usize - 'a' as usize;
        let b = chars[1] as usize - 'a' as usize;
        if a < 26 && b < 26 && a != b {
            wiring[a] = chars[1];
            wiring[b] = chars[0];
        }
    }
    wiring.into_iter().collect()
}

fn caesar_shift(text: &str, shift: i32) -> String {
    text.chars()
        .map(|c| {
            if c.is_ascii_alphabetic() {
                let base = if c.is_ascii_uppercase() { b'A' } else { b'a' };
                let value = c as i32 - base as i32;
                (base + (value + shift).rem_euclid(26) as u8) as char
            } else {
                c
            }
        })
        .collect()
}

fn caesar_brute(text: &str) -> String {
    (1..=25)
        .map(|shift| format!("偏移 {shift:02}: {}", caesar_shift(text, -shift)))
        .collect::<Vec<_>>()
        .join("\n")
}

fn vigenere_key_letters(key: &str, fallback: &str) -> Vec<char> {
    let letters: Vec<char> = key
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_uppercase())
        .collect();
    if letters.is_empty() {
        fallback.chars().collect()
    } else {
        letters
    }
}

fn vigenere_key_digits(key: &str) -> Vec<i32> {
    let digits: Vec<i32> = key
        .chars()
        .filter_map(|c| c.to_digit(10).map(|d| d as i32))
        .collect();
    if digits.is_empty() {
        vec![3, 1, 4, 1, 5]
    } else {
        digits
    }
}

fn alpha_val(c: char) -> i32 {
    c.to_ascii_uppercase() as i32 - 'A' as i32
}

fn alpha_from_val(source: char, value: i32) -> char {
    let base = if source.is_ascii_uppercase() { b'A' } else { b'a' };
    (base + value.rem_euclid(26) as u8) as char
}

fn vigenere_run(text: &str, keys: &[i32], f: impl Fn(i32, i32) -> i32) -> String {
    let cleaned: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    let mut out = String::new();
    let mut key_index = 0usize;
    for c in cleaned.chars() {
        if c.is_ascii_alphabetic() {
            let key = keys[key_index % keys.len()];
            out.push(alpha_from_val(c, f(alpha_val(c), key)));
            key_index += 1;
        } else {
            out.push(c);
        }
    }
    out
}

fn vigenere_encrypt(text: &str, key: &str) -> String {
    let keys: Vec<i32> = vigenere_key_letters(key, "KEY")
        .into_iter()
        .map(alpha_val)
        .collect();
    vigenere_run(text, &keys, |value, shift| value + shift)
}

fn vigenere_decrypt(text: &str, key: &str) -> String {
    let keys: Vec<i32> = vigenere_key_letters(key, "KEY")
        .into_iter()
        .map(alpha_val)
        .collect();
    vigenere_run(text, &keys, |value, shift| value - shift)
}

fn vigenere_autokey_encrypt(text: &str, key: &str) -> String {
    let cleaned: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    let base_key: String = vigenere_key_letters(key, "KEY").into_iter().collect();
    let plain: Vec<char> = cleaned
        .chars()
        .filter(|c| c.is_ascii_alphabetic())
        .map(|c| c.to_ascii_uppercase())
        .collect();
    let base_chars: Vec<char> = base_key.chars().collect();
    let mut out = String::new();
    let mut letter_index = 0usize;
    for c in cleaned.chars() {
        if c.is_ascii_alphabetic() {
            let key_char = if letter_index < base_chars.len() {
                base_chars[letter_index]
            } else {
                *plain
                    .get(letter_index - base_chars.len())
                    .unwrap_or(&'A')
            };
            out.push(alpha_from_val(c, alpha_val(c) + alpha_val(key_char)));
            letter_index += 1;
        } else {
            out.push(c);
        }
    }
    out
}

fn vigenere_autokey_decrypt(text: &str, key: &str) -> String {
    let cleaned: String = text.chars().filter(|c| !c.is_whitespace()).collect();
    let base_key: Vec<char> = vigenere_key_letters(key, "KEY");
    let mut out = String::new();
    let mut recovered: Vec<char> = Vec::new();
    let mut letter_index = 0usize;
    for c in cleaned.chars() {
        if c.is_ascii_alphabetic() {
            let key_char = if letter_index < base_key.len() {
                base_key[letter_index]
            } else {
                *recovered
                    .get(letter_index - base_key.len())
                    .unwrap_or(&'A')
            };
            let plain = alpha_from_val(c, alpha_val(c) - alpha_val(key_char));
            recovered.push(plain.to_ascii_uppercase());
            out.push(plain);
            letter_index += 1;
        } else {
            out.push(c);
        }
    }
    out
}

fn vigenere_porta(text: &str, key: &str) -> String {
    let keys: Vec<i32> = vigenere_key_letters(key, "KEY")
        .into_iter()
        .map(|c| alpha_val(c) / 2)
        .collect();
    vigenere_run(text, &keys, |value, pair| {
        if value < 13 {
            13 + ((value + pair) % 13)
        } else {
            (value - 13 - pair + 13) % 13
        }
    })
}

fn vigenere_process(text: &str, key: &str, variant: &str) -> String {
    match variant {
        "beaufort" => {
            let keys: Vec<i32> = vigenere_key_letters(key, "KEY")
                .into_iter()
                .map(alpha_val)
                .collect();
            format!("加密/解密: {}", vigenere_run(text, &keys, |value, shift| shift - value))
        }
        "variantBeaufort" => format!(
            "加密: {}\n解密: {}",
            vigenere_decrypt(text, key),
            vigenere_encrypt(text, key)
        ),
        "autokey" => format!(
            "加密: {}\n解密: {}",
            vigenere_autokey_encrypt(text, key),
            vigenere_autokey_decrypt(text, key)
        ),
        "gronsfeld" => {
            let keys = vigenere_key_digits(key);
            format!(
                "加密: {}\n解密: {}",
                vigenere_run(text, &keys, |value, shift| value + shift),
                vigenere_run(text, &keys, |value, shift| value - shift)
            )
        }
        "porta" => format!("加密/解密: {}", vigenere_porta(text, key)),
        _ => format!(
            "加密: {}\n解密: {}",
            vigenere_encrypt(text, key),
            vigenere_decrypt(text, key)
        ),
    }
}

fn clean_no_ws(text: &str) -> Vec<char> {
    text.chars().filter(|c| !c.is_whitespace()).collect()
}

fn rail_fence_order(len: usize, rails: i32) -> Vec<usize> {
    let rails = rails.max(2) as usize;
    let period = 2 * rails - 2;
    let mut order = Vec::with_capacity(len);
    for row in 0..rails {
        for index in 0..len {
            let pos = index % period;
            if pos == row || pos == period - row {
                order.push(index);
            }
        }
    }
    order
}

fn rail_fence_encode(text: &str, rails: i32) -> String {
    if rails < 2 {
        return String::new();
    }
    let chars = clean_no_ws(text);
    rail_fence_order(chars.len(), rails)
        .into_iter()
        .filter_map(|i| chars.get(i).copied())
        .collect()
}

fn rail_fence_decode(text: &str, rails: i32) -> String {
    let chars = clean_no_ws(text);
    let order = rail_fence_order(chars.len(), rails);
    let mut out = vec!['\0'; chars.len()];
    for (cipher_index, original_index) in order.into_iter().enumerate() {
        if let Some(ch) = chars.get(cipher_index) {
            out[original_index] = *ch;
        }
    }
    out.into_iter().filter(|c| *c != '\0').collect()
}

fn transposition_key_order(key: &str, count: Option<usize>) -> Vec<usize> {
    let raw = key.trim();
    let separated_numeric = raw
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|part| !part.is_empty())
        .all(|part| part.chars().all(|c| c.is_ascii_digit()))
        && raw.chars().any(|c| c.is_whitespace() || c == ',');
    let mut tokens: Vec<i32> = if separated_numeric {
        raw.split(|c: char| c.is_whitespace() || c == ',')
            .filter(|part| !part.is_empty())
            .filter_map(|part| part.parse().ok())
            .collect()
    } else if raw.len() >= 2 && raw.chars().all(|c| c.is_ascii_digit()) {
        raw.chars()
            .filter_map(|c| c.to_digit(10).map(|d| d as i32))
            .collect()
    } else {
        (if raw.is_empty() { "KEY" } else { raw })
            .chars()
            .map(|c| c.to_ascii_uppercase() as i32)
            .collect()
    };
    if let Some(count) = count {
        if tokens.len() != count {
            tokens.truncate(count);
        }
    }
    let mut indexed: Vec<(i32, usize)> = tokens.drain(..).zip(0..).collect();
    indexed.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
    indexed.into_iter().map(|(_, index)| index).collect()
}

fn transposition_key_length(key: &str, fallback: usize) -> usize {
    let raw = key.trim();
    let separated_numeric = raw
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|part| !part.is_empty())
        .all(|part| part.chars().all(|c| c.is_ascii_digit()))
        && raw.chars().any(|c| c.is_whitespace() || c == ',');
    if separated_numeric {
        raw.split(|c: char| c.is_whitespace() || c == ',')
            .filter(|part| !part.is_empty())
            .count()
            .max(2)
    } else if raw.len() >= 2 && raw.chars().all(|c| c.is_ascii_digit()) {
        raw.len().max(2)
    } else {
        raw.len().max(fallback).max(2)
    }
}

fn route_encode(text: &str, cols: i32) -> String {
    let chars = clean_no_ws(text);
    let cols = cols.max(2) as usize;
    let rows = chars.len().div_ceil(cols);
    let mut grid = vec![vec!['X'; cols]; rows];
    for row in 0..rows {
        for col in 0..cols {
            if let Some(ch) = chars.get(row * cols + col) {
                grid[row][col] = *ch;
            }
        }
    }
    let mut top = 0isize;
    let mut bottom = rows as isize - 1;
    let mut left = 0isize;
    let mut right = cols as isize - 1;
    let mut out = String::new();
    while top <= bottom && left <= right {
        for col in left..=right {
            out.push(grid[top as usize][col as usize]);
        }
        top += 1;
        for row in top..=bottom {
            out.push(grid[row as usize][right as usize]);
        }
        right -= 1;
        if top <= bottom {
            for col in (left..=right).rev() {
                out.push(grid[bottom as usize][col as usize]);
            }
            bottom -= 1;
        }
        if left <= right {
            for row in (top..=bottom).rev() {
                out.push(grid[row as usize][left as usize]);
            }
            left += 1;
        }
    }
    out
}

fn route_decode(text: &str, cols: i32) -> String {
    let chars = clean_no_ws(text);
    let cols = cols.max(2) as usize;
    let rows = chars.len().div_ceil(cols);
    let mut grid = vec![vec!['\0'; cols]; rows];
    let mut index = 0usize;
    let mut top = 0isize;
    let mut bottom = rows as isize - 1;
    let mut left = 0isize;
    let mut right = cols as isize - 1;
    while top <= bottom && left <= right {
        for col in left..=right {
            grid[top as usize][col as usize] = *chars.get(index).unwrap_or(&'\0');
            index += 1;
        }
        top += 1;
        for row in top..=bottom {
            grid[row as usize][right as usize] = *chars.get(index).unwrap_or(&'\0');
            index += 1;
        }
        right -= 1;
        if top <= bottom {
            for col in (left..=right).rev() {
                grid[bottom as usize][col as usize] = *chars.get(index).unwrap_or(&'\0');
                index += 1;
            }
            bottom -= 1;
        }
        if left <= right {
            for row in (top..=bottom).rev() {
                grid[row as usize][left as usize] = *chars.get(index).unwrap_or(&'\0');
                index += 1;
            }
            left += 1;
        }
    }
    grid.into_iter()
        .flatten()
        .filter(|c| *c != '\0')
        .collect::<String>()
        .trim_end_matches('X')
        .to_string()
}

fn amsco_layout(len: usize, cols: usize) -> Vec<Vec<usize>> {
    let mut layout = Vec::new();
    let mut used = 0usize;
    let mut size = 1usize;
    while used < len {
        let mut row = Vec::new();
        for _ in 0..cols {
            if used >= len {
                break;
            }
            let n = size.min(len - used);
            row.push(n);
            used += n;
            size = if size == 1 { 2 } else { 1 };
        }
        while row.len() < cols {
            row.push(0);
        }
        layout.push(row);
    }
    layout
}

fn amsco_encode(text: &str, key: &str, fallback: i32) -> String {
    let chars = clean_no_ws(text);
    let cols = transposition_key_length(key, fallback.max(2) as usize);
    let layout = amsco_layout(chars.len(), cols);
    let mut index = 0usize;
    let mut grid = Vec::new();
    for row in &layout {
        let mut grid_row = Vec::new();
        for n in row {
            let part: String = chars.iter().skip(index).take(*n).collect();
            index += *n;
            grid_row.push(part);
        }
        grid.push(grid_row);
    }
    transposition_key_order(key, Some(cols))
        .into_iter()
        .map(|col| {
            grid.iter()
                .map(|row| row.get(col).cloned().unwrap_or_default())
                .collect::<String>()
        })
        .collect()
}

fn amsco_decode(text: &str, key: &str, fallback: i32) -> String {
    let chars = clean_no_ws(text);
    let cols = transposition_key_length(key, fallback.max(2) as usize);
    let layout = amsco_layout(chars.len(), cols);
    let mut grid = vec![vec![String::new(); cols]; layout.len()];
    let mut index = 0usize;
    for col in transposition_key_order(key, Some(cols)) {
        let need: usize = layout.iter().map(|row| row.get(col).copied().unwrap_or(0)).sum();
        let chunk: Vec<char> = chars.iter().skip(index).take(need).copied().collect();
        index += need;
        let mut pos = 0usize;
        for (row_index, row) in layout.iter().enumerate() {
            let n = row.get(col).copied().unwrap_or(0);
            grid[row_index][col] = chunk.iter().skip(pos).take(n).collect();
            pos += n;
        }
    }
    grid.into_iter().flatten().collect()
}

fn myszkowski_groups(key: &str) -> Vec<Vec<usize>> {
    let chars: Vec<char> = if key.is_empty() {
        "BALLOON".chars().collect()
    } else {
        key.to_uppercase().chars().collect()
    };
    let mut values = chars.clone();
    values.sort_unstable();
    values.dedup();
    values
        .into_iter()
        .map(|value| {
            chars
                .iter()
                .enumerate()
                .filter_map(|(index, c)| (*c == value).then_some(index))
                .collect()
        })
        .collect()
}

fn myszkowski_encode(text: &str, key: &str) -> String {
    let chars = clean_no_ws(text);
    let cols = key.len().max("BALLOON".len()).max(2);
    let rows = chars.len().div_ceil(cols);
    let mut grid = vec![vec!['\0'; cols]; rows];
    for row in 0..rows {
        for col in 0..cols {
            if let Some(ch) = chars.get(row * cols + col) {
                grid[row][col] = *ch;
            }
        }
    }
    let mut out = String::new();
    for group in myszkowski_groups(key) {
        if group.len() == 1 {
            for row in 0..rows {
                let ch = grid[row][group[0]];
                if ch != '\0' {
                    out.push(ch);
                }
            }
        } else {
            for row in 0..rows {
                for col in &group {
                    let ch = grid[row][*col];
                    if ch != '\0' {
                        out.push(ch);
                    }
                }
            }
        }
    }
    out
}

fn myszkowski_decode(text: &str, key: &str) -> String {
    let chars = clean_no_ws(text);
    let cols = key.len().max("BALLOON".len()).max(2);
    let rows = chars.len().div_ceil(cols);
    let mut grid = vec![vec!['\0'; cols]; rows];
    let mut index = 0usize;
    for group in myszkowski_groups(key) {
        let mut positions = Vec::new();
        if group.len() == 1 {
            for row in 0..rows {
                let pos = row * cols + group[0];
                if pos < chars.len() {
                    positions.push((row, group[0]));
                }
            }
        } else {
            for row in 0..rows {
                for col in &group {
                    let pos = row * cols + *col;
                    if pos < chars.len() {
                        positions.push((row, *col));
                    }
                }
            }
        }
        for (row, col) in positions {
            if let Some(ch) = chars.get(index) {
                grid[row][col] = *ch;
            }
            index += 1;
        }
    }
    grid.into_iter().flatten().filter(|c| *c != '\0').collect()
}

fn transposition_process(text: &str, count: i32, key: &str, variant: &str) -> String {
    let count = count.max(2);
    match variant {
        "route" => format!("加密: {}\n解密: {}", route_encode(text, count), route_decode(text, count)),
        "scytale" => format!(
            "加密: {}\n解密: {}",
            columnar_rail_encode(text, count),
            columnar_rail_decode(text, count)
        ),
        "amsco" => format!("加密: {}\n解密: {}", amsco_encode(text, key, count), amsco_decode(text, key, count)),
        "myszkowski" => format!("加密: {}\n解密: {}", myszkowski_encode(text, key), myszkowski_decode(text, key)),
        _ => format!("加密: {}\n解密: {}", rail_fence_encode(text, count), rail_fence_decode(text, count)),
    }
}

fn atbash(text: &str) -> String {
    text.chars()
        .map(|c| {
            if c.is_ascii_uppercase() {
                (b'Z' - (c as u8 - b'A')) as char
            } else if c.is_ascii_lowercase() {
                (b'z' - (c as u8 - b'a')) as char
            } else {
                c
            }
        })
        .collect()
}

fn digit_value(c: char) -> Option<u32> {
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        .chars()
        .position(|x| x == c.to_ascii_uppercase())
        .map(|v| v as u32)
}

fn convert_integer_base(raw: &str, from_base: i32, to_base: i32) -> Option<String> {
    if !(1..=36).contains(&from_base) || !(1..=36).contains(&to_base) {
        return None;
    }
    let mut digits: Vec<u32> = Vec::new();
    for c in raw.chars() {
        let value = digit_value(c)?;
        if value >= from_base as u32 {
            return None;
        }
        digits.push(value);
    }
    if to_base == 1 {
        let mut value = 0usize;
        for digit in digits {
            value = value
                .saturating_mul(from_base as usize)
                .saturating_add(digit as usize);
        }
        return Some("0".repeat(value));
    }
    if digits.is_empty() || digits.iter().all(|d| *d == 0) {
        return Some("0".to_string());
    }
    let mut result = Vec::new();
    while digits.iter().any(|d| *d != 0) {
        let mut quotient = Vec::new();
        let mut remainder = 0u32;
        let mut started = false;
        for digit in &digits {
            let value = remainder * from_base as u32 + *digit;
            let q = value / to_base as u32;
            remainder = value % to_base as u32;
            if q != 0 || started {
                quotient.push(q);
                started = true;
            }
        }
        result.push(remainder);
        digits = if quotient.is_empty() { vec![0] } else { quotient };
    }
    let charset: Vec<char> = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect();
    Some(
        result
            .into_iter()
            .rev()
            .filter_map(|v| charset.get(v as usize).copied())
            .collect(),
    )
}

fn base_convert(input: &str, from_base: i32, to_base: i32) -> String {
    input
        .split(' ')
        .map(|token| {
            let (integer, fraction) = token.split_once('.').unwrap_or((token, ""));
            let Some(mut result) = convert_integer_base(integer, from_base, to_base) else {
                return format!("?{token}");
            };
            if fraction.is_empty() {
                return result;
            }
            let mut fraction_value = 0f64;
            for c in fraction.chars() {
                let Some(value) = digit_value(c) else {
                    return format!("?{token}");
                };
                if value >= from_base as u32 {
                    return format!("?{token}");
                }
                fraction_value = fraction_value * from_base as f64 + value as f64;
            }
            fraction_value /= (from_base as f64).powi(fraction.chars().count() as i32);
            if fraction_value <= 0.0 {
                return result;
            }
            result.push('.');
            let charset: Vec<char> = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".chars().collect();
            for _ in 0..20 {
                if fraction_value <= 0.0 {
                    break;
                }
                fraction_value *= to_base as f64;
                let digit = fraction_value.floor() as usize;
                result.push(*charset.get(digit).unwrap_or(&'?'));
                fraction_value -= digit as f64;
            }
            result
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn base_convert_by_char(input: &str, from_base: i32, to_base: i32) -> String {
    input
        .to_uppercase()
        .chars()
        .map(|c| {
            if c == '.' {
                ".".to_string()
            } else {
                let Some(value) = digit_value(c) else {
                    return format!("?{c}");
                };
                if value >= from_base as u32 {
                    format!("?{c}")
                } else if value == 0 {
                    "0".to_string()
                } else {
                    convert_integer_base(&value.to_string(), 10, to_base).unwrap_or_else(|| format!("?{c}"))
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn a1z26_offset(mode: &str) -> i32 {
    if mode == "a0" {
        0
    } else {
        1
    }
}

fn a1z26_encode(text: &str, mode: &str) -> String {
    let off = a1z26_offset(mode);
    let mut parts = Vec::new();
    for c in text.chars() {
        if c.is_ascii_alphabetic() {
            parts.push((alpha_val(c) + off).to_string());
        } else if c.is_whitespace() {
            parts.push("/".to_string());
        } else {
            parts.push(c.to_string());
        }
    }
    parts.join(" ").split_whitespace().collect::<Vec<_>>().join(" ")
}

fn a1z26_decode(text: &str, mode: &str) -> String {
    let off = a1z26_offset(mode);
    let min = off;
    let max = off + 25;
    let mut out = String::new();
    let mut digits = String::new();
    let flush = |digits: &mut String, out: &mut String| {
        if !digits.is_empty() {
            if let Ok(value) = digits.parse::<i32>() {
                if (min..=max).contains(&value) {
                    out.push((b'A' + (value - off) as u8) as char);
                } else {
                    out.push_str(digits);
                }
            } else {
                out.push_str(digits);
            }
            digits.clear();
        }
    };
    for c in text.chars() {
        if c.is_ascii_digit() {
            digits.push(c);
        } else {
            flush(&mut digits, &mut out);
            if c == '/' {
                if !out.ends_with(' ') {
                    out.push(' ');
                }
            } else {
                out.push(c);
            }
        }
    }
    flush(&mut digits, &mut out);
    out
}

fn morse_lookup(c: char) -> Option<&'static str> {
    MORSE_DICT
        .iter()
        .find_map(|(key, value)| (*key == c).then_some(*value))
}

fn morse_reverse(code: &str) -> Option<char> {
    MORSE_DICT
        .iter()
        .find_map(|(key, value)| (*value == code).then_some(*key))
}

fn morse_encode(text: &str) -> String {
    text.to_uppercase()
        .chars()
        .map(|c| morse_lookup(c).map(str::to_string).unwrap_or_else(|| c.to_string()))
        .collect::<Vec<_>>()
        .join(" ")
}

fn morse_decode(text: &str) -> String {
    text.split(' ')
        .map(|code| morse_reverse(code).map(|c| c.to_string()).unwrap_or_else(|| code.to_string()))
        .collect()
}

fn morse_trigrams() -> Vec<String> {
    let marks = ['.', '-', 'x'];
    let mut out = Vec::new();
    for a in marks {
        for b in marks {
            for c in marks {
                let trigram = format!("{a}{b}{c}");
                if trigram != "xxx" {
                    out.push(trigram);
                }
            }
        }
    }
    out
}

fn keyed_alphabet(key: &str) -> String {
    let mut seen = HashSet::new();
    format!("{key}ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_uppercase() && seen.insert(*c))
        .take(26)
        .collect()
}

fn fractionated_morse_encode(text: &str, key: &str) -> String {
    let alpha: Vec<char> = keyed_alphabet(key).chars().collect();
    let trigrams = morse_trigrams();
    let table: HashMap<String, char> = trigrams.into_iter().zip(alpha).collect();
    let words: Vec<String> = text
        .to_uppercase()
        .split_whitespace()
        .filter_map(|word| {
            let codes: Vec<&str> = word
                .chars()
                .filter(|c| c.is_ascii_uppercase())
                .filter_map(morse_lookup)
                .collect();
            (!codes.is_empty()).then(|| codes.join("x"))
        })
        .collect();
    let mut stream = words.join("xx");
    if stream.is_empty() {
        return String::new();
    }
    while stream.len() % 3 != 0 {
        stream.push('x');
    }
    stream
        .as_bytes()
        .chunks(3)
        .map(|chunk| {
            let key = std::str::from_utf8(chunk).unwrap_or("");
            table.get(key).copied().unwrap_or('?')
        })
        .collect()
}

fn fractionated_morse_decode(text: &str, key: &str) -> String {
    let alpha: Vec<char> = keyed_alphabet(key).chars().collect();
    let trigrams = morse_trigrams();
    let reverse_tri: HashMap<char, String> = alpha.into_iter().zip(trigrams).collect();
    let mut stream = String::new();
    for c in text.to_uppercase().chars() {
        if let Some(code) = reverse_tri.get(&c) {
            stream.push_str(code);
        }
    }
    while stream.ends_with('x') {
        stream.pop();
    }
    stream
        .split("xx")
        .map(|word| {
            word.split('x')
                .filter_map(morse_reverse)
                .collect::<String>()
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn morse_process(text: &str, variant: &str, key: &str) -> String {
    if variant == "fractionated" {
        format!(
            "加密: {}\n解密: {}",
            fractionated_morse_encode(text, key),
            fractionated_morse_decode(text, key)
        )
    } else {
        format!("加密: {}\n解密: {}", morse_encode(text), morse_decode(text))
    }
}

fn phone_pairs() -> &'static [(char, &'static str)] {
    &[
        ('A', "21"),
        ('B', "22"),
        ('C', "23"),
        ('D', "31"),
        ('E', "32"),
        ('F', "33"),
        ('G', "41"),
        ('H', "42"),
        ('I', "43"),
        ('J', "51"),
        ('K', "52"),
        ('L', "53"),
        ('M', "61"),
        ('N', "62"),
        ('O', "63"),
        ('P', "71"),
        ('Q', "72"),
        ('R', "73"),
        ('S', "74"),
        ('T', "81"),
        ('U', "82"),
        ('V', "83"),
        ('W', "91"),
        ('X', "92"),
        ('Y', "93"),
        ('Z', "94"),
        (' ', "0"),
    ]
}

fn phone_encode(text: &str) -> String {
    text.to_uppercase()
        .chars()
        .map(|c| {
            phone_pairs()
                .iter()
                .find_map(|(key, value)| (*key == c).then_some((*value).to_string()))
                .unwrap_or_else(|| c.to_string())
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn phone_decode(text: &str) -> String {
    text.split(' ')
        .map(|code| {
            phone_pairs()
                .iter()
                .find_map(|(key, value)| (*value == code).then_some(*key))
                .map(|c| c.to_string())
                .unwrap_or_else(|| code.to_string())
        })
        .collect()
}

fn beale_encode(text: &str, key: &str) -> String {
    if text.is_empty() || key.is_empty() {
        return "无效密钥或文本".to_string();
    }
    let keys: Vec<i32> = key
        .split(' ')
        .filter_map(|part| part.parse::<i32>().ok())
        .collect();
    text.split(' ')
        .enumerate()
        .filter_map(|(index, word)| {
            keys.get(index)
                .filter(|value| **value != 0)
                .and_then(|_| word.chars().next())
        })
        .collect()
}

fn fanqie_initials() -> &'static [(i32, &'static str)] {
    &[
        (1, "l"),
        (2, "b"),
        (3, "q"),
        (4, "d"),
        (5, "b"),
        (6, "t"),
        (7, "zh"),
        (8, "r"),
        (9, "sh"),
        (11, "y"),
        (12, "m"),
        (13, "y"),
        (14, "ch"),
        (15, "x"),
        (16, "d"),
        (17, "zh"),
        (18, "y"),
        (19, "j"),
        (20, "zh"),
    ]
}

fn fanqie_finals() -> &'static [(i32, &'static str)] {
    &[
        (1, "un"),
        (2, "ua"),
        (3, "iang"),
        (4, "iu"),
        (5, "an"),
        (6, "ai"),
        (7, "ia"),
        (8, "in"),
        (9, "uan"),
        (10, "e"),
        (11, "v"),
        (12, "in"),
        (13, "ei"),
        (14, "u"),
        (15, "eng"),
        (16, "uang"),
        (17, "ui"),
        (18, "ao"),
        (19, "in"),
        (20, "ang"),
        (22, "ong"),
        (23, "iao"),
        (24, "uo"),
        (25, "i"),
        (26, "iao"),
        (27, "i"),
        (28, "eng"),
        (29, "ui"),
        (30, "u"),
        (31, "ian"),
        (32, "i"),
        (33, "ei"),
        (34, "ai"),
        (35, "e"),
        (36, "ou"),
    ]
}

fn fanqie_decode(code_text: &str) -> String {
    code_text
        .trim()
        .split_whitespace()
        .map(|part| {
            let (i, f) = part
                .split_once(&['/', '-'][..])
                .map(|(a, b)| (a, b))
                .unwrap_or((part, ""));
            let initial = i
                .parse::<i32>()
                .ok()
                .and_then(|n| fanqie_initials().iter().find_map(|(k, v)| (*k == n).then_some(*v)))
                .unwrap_or("");
            let final_part = f
                .parse::<i32>()
                .ok()
                .and_then(|n| fanqie_finals().iter().find_map(|(k, v)| (*k == n).then_some(*v)))
                .unwrap_or("");
            if initial.is_empty() && final_part.is_empty() {
                "输入如15-8".to_string()
            } else {
                format!("{initial}{final_part}")
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn fanqie_reverse_initials() -> Vec<(&'static str, i32)> {
    let mut map: HashMap<&'static str, i32> = HashMap::new();
    let mut order = Vec::new();
    for (code, value) in fanqie_initials() {
        if !map.contains_key(value) {
            order.push(*value);
        }
        map.insert(*value, *code);
    }
    order
        .into_iter()
        .filter_map(|value| map.get(value).map(|code| (value, *code)))
        .collect()
}

fn fanqie_reverse_finals() -> HashMap<&'static str, i32> {
    let mut map = HashMap::new();
    for (code, value) in fanqie_finals() {
        map.insert(*value, *code);
    }
    map
}

fn fanqie_encode(text: &str) -> String {
    let finals = fanqie_reverse_finals();
    text.trim()
        .split_whitespace()
        .map(|word| {
            let mut found = None;
            for (initial, code) in fanqie_reverse_initials() {
                if word.starts_with(initial) {
                    let tail = &word[initial.len()..];
                    found = Some(format!("{}/{}", code, finals.get(tail).copied().unwrap_or_default()));
                    break;
                }
            }
            found.unwrap_or_else(|| {
                finals
                    .get(word)
                    .map(|code| format!("0/{code}"))
                    .unwrap_or_else(|| "输入如qiu".to_string())
            })
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn dna_pairs() -> &'static [(&'static str, char)] {
    &[
        ("GCU", 'A'),
        ("GCC", 'A'),
        ("GCA", 'B'),
        ("GCG", 'B'),
        ("UGU", 'C'),
        ("UGC", 'C'),
        ("GAU", 'D'),
        ("GAC", 'D'),
        ("GAA", 'E'),
        ("GAG", 'E'),
        ("UUU", 'F'),
        ("UUC", 'F'),
        ("GGU", 'G'),
        ("GGC", 'G'),
        ("GGA", 'G'),
        ("GGG", 'G'),
        ("CAU", 'H'),
        ("AUU", 'I'),
        ("AUC", 'I'),
        ("AUA", 'I'),
        ("AGA", 'J'),
        ("AGG", 'J'),
        ("AAA", 'K'),
        ("AAG", 'K'),
        ("CUU", 'L'),
        ("CUC", 'L'),
        ("CUA", 'L'),
        ("CUG", 'L'),
        ("AUG", 'M'),
        ("AAU", 'N'),
        ("AAC", 'N'),
        ("CCA", 'O'),
        ("CCG", 'O'),
        ("CCU", 'P'),
        ("CCC", 'P'),
        ("CAA", 'Q'),
        ("CAG", 'Q'),
        ("CGU", 'R'),
        ("CGC", 'R'),
        ("CGA", 'R'),
        ("CGG", 'R'),
        ("UCU", 'S'),
        ("UCC", 'S'),
        ("UCA", 'S'),
        ("UCG", 'S'),
        ("AGU", 'S'),
        ("AGC", 'S'),
        ("ACU", 'T'),
        ("ACC", 'T'),
        ("ACA", 'T'),
        ("ACG", 'T'),
        ("UUA", 'U'),
        ("UUG", 'U'),
        ("GUU", 'V'),
        ("GUC", 'V'),
        ("UGG", 'W'),
        ("GUA", 'X'),
        ("GUG", 'X'),
        ("UAU", 'Y'),
        ("UAC", 'Y'),
        ("CAC", 'Z'),
    ]
}

fn dna_decode(text: &str) -> String {
    let decoded: String = text
        .trim()
        .split_whitespace()
        .filter_map(|code| {
            dna_pairs()
                .iter()
                .find_map(|(k, v)| (*k == code).then_some(*v))
        })
        .collect();
    if decoded.is_empty() {
        "请输入正确密码子如:GCU".to_string()
    } else {
        decoded
    }
}

fn dna_encode(text: &str) -> String {
    let mut reverse = HashMap::new();
    for (code, letter) in dna_pairs() {
        reverse.insert(*letter, *code);
    }
    let out: Vec<&str> = text
        .to_uppercase()
        .chars()
        .map(|c| reverse.get(&c).copied().unwrap_or("?"))
        .collect();
    if out.is_empty() {
        " ".to_string()
    } else {
        out.join(" ")
    }
}

fn v_keyboard_pairs() -> &'static [(&'static str, char)] {
    &[
        ("12", 'q'),
        ("23", 'w'),
        ("34", 'e'),
        ("45", 'r'),
        ("56", 't'),
        ("67", 'y'),
        ("78", 'u'),
        ("89", 'i'),
        ("90", 'o'),
        ("13", 'a'),
        ("24", 's'),
        ("35", 'd'),
        ("46", 'f'),
        ("57", 'g'),
        ("68", 'h'),
        ("79", 'j'),
        ("80", 'k'),
        ("14", 'z'),
        ("25", 'x'),
        ("36", 'c'),
        ("47", 'v'),
        ("58", 'b'),
        ("69", 'n'),
        ("70", 'm'),
    ]
}

fn v_keyboard_decode(text: &str) -> String {
    let reverse: HashMap<char, &str> = v_keyboard_pairs().iter().map(|(k, v)| (*v, *k)).collect();
    let chars: Vec<char> = text.to_lowercase().chars().collect();
    if let Some(invalid) = chars.iter().find(|c| **c != ' ' && !reverse.contains_key(c)) {
        return format!("无效字符 {invalid}");
    }
    chars
        .into_iter()
        .map(|c| if c == ' ' { " ".to_string() } else { reverse[&c].to_string() })
        .collect::<Vec<_>>()
        .join(" ")
}

fn v_keyboard_encode(text: &str) -> String {
    let mut invalid = None;
    let codes: Vec<&str> = text.trim().split_whitespace().collect();
    for code in &codes {
        if !v_keyboard_pairs().iter().any(|(k, _)| k == code) {
            invalid = Some(*code);
            break;
        }
    }
    if let Some(invalid) = invalid {
        invalid.to_string()
    } else {
        codes
            .into_iter()
            .filter_map(|code| v_keyboard_pairs().iter().find_map(|(k, v)| (*k == code).then_some(*v)))
            .collect()
    }
}

fn qwe_map() -> &'static [(char, char)] {
    &[
        ('q', 'a'),
        ('w', 'b'),
        ('e', 'c'),
        ('r', 'd'),
        ('t', 'e'),
        ('y', 'f'),
        ('u', 'g'),
        ('i', 'h'),
        ('o', 'i'),
        ('p', 'j'),
        ('a', 'k'),
        ('s', 'l'),
        ('d', 'm'),
        ('f', 'n'),
        ('g', 'o'),
        ('h', 'p'),
        ('j', 'q'),
        ('k', 'r'),
        ('l', 's'),
        ('z', 't'),
        ('x', 'u'),
        ('c', 'v'),
        ('v', 'w'),
        ('b', 'x'),
        ('n', 'y'),
        ('m', 'z'),
    ]
}

fn qwe_decode(text: &str) -> String {
    let chars: Vec<char> = text.to_lowercase().chars().collect();
    if let Some(invalid) = chars
        .iter()
        .find(|c| **c != ' ' && !qwe_map().iter().any(|(k, _)| k == *c))
    {
        return format!("无效字符: {invalid}");
    }
    chars
        .into_iter()
        .map(|c| {
            if c == ' ' {
                ' '
            } else {
                qwe_map().iter().find_map(|(k, v)| (*k == c).then_some(*v)).unwrap_or(c)
            }
        })
        .collect()
}

fn qwe_encode(text: &str) -> String {
    let chars: Vec<char> = text.to_lowercase().chars().collect();
    if let Some(invalid) = chars
        .iter()
        .find(|c| **c != ' ' && !qwe_map().iter().any(|(_, v)| v == *c))
    {
        return format!("无效字符: {invalid}");
    }
    chars
        .into_iter()
        .map(|c| {
            if c == ' ' {
                ' '
            } else {
                qwe_map().iter().find_map(|(k, v)| (*v == c).then_some(*k)).unwrap_or(c)
            }
        })
        .collect()
}

fn bacon_pairs() -> &'static [(char, &'static str)] {
    &[
        ('0', "abbba"),
        ('1', "aaaaa"),
        ('2', "aaaab"),
        ('3', "aaaba"),
        ('4', "aaabb"),
        ('5', "aabaa"),
        ('6', "aabab"),
        ('7', "aabba"),
        ('8', "aabbb"),
        ('9', "abaaa"),
        ('A', "aaaaa"),
        ('B', "aaaab"),
        ('C', "aaaba"),
        ('D', "aaabb"),
        ('E', "aabaa"),
        ('F', "aabab"),
        ('G', "aabba"),
        ('H', "aabbb"),
        ('I', "abaaa"),
        ('K', "ababa"),
        ('L', "ababb"),
        ('M', "abbaa"),
        ('N', "abbab"),
        ('O', "abbba"),
        ('P', "abbbb"),
        ('Q', "baaaa"),
        ('R', "baaab"),
        ('S', "baaba"),
        ('T', "baabb"),
        ('U', "babaa"),
        ('V', "babab"),
        ('W', "babba"),
        ('X', "babbb"),
        ('Y', "bbaaa"),
        ('Z', "bbaab"),
    ]
}

fn bacon_encode(text: &str) -> String {
    let chars: Vec<char> = text.to_uppercase().chars().collect();
    if let Some(invalid) = chars
        .iter()
        .find(|c| **c != ' ' && !bacon_pairs().iter().any(|(k, _)| k == *c))
    {
        return format!("Invalid char: {invalid}");
    }
    chars
        .into_iter()
        .map(|c| {
            if c == ' ' {
                " ".to_string()
            } else {
                bacon_pairs()
                    .iter()
                    .find_map(|(k, v)| (*k == c).then_some((*v).to_string()))
                    .unwrap_or_default()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

fn bacon_decode(text: &str) -> String {
    let clean: String = text
        .to_lowercase()
        .chars()
        .filter(|c| *c == 'a' || *c == 'b')
        .collect();
    let mut reverse = HashMap::new();
    for (letter, code) in bacon_pairs() {
        reverse.insert(*code, *letter);
    }
    let mut out = String::new();
    for chunk in clean.as_bytes().chunks(5) {
        if chunk.len() != 5 {
            continue;
        }
        let code = std::str::from_utf8(chunk).unwrap_or("");
        let Some(letter) = reverse.get(code) else {
            return format!("Invalid code: {code}");
        };
        out.push(*letter);
    }
    out
}

fn symbol_encode(symbol_type: &str, text: &str) -> String {
    let symbols = if symbol_type == "dancingMen" {
        &DANCING_SYMBOLS
    } else {
        &PIGPEN_SYMBOLS
    };
    text.to_uppercase()
        .chars()
        .map(|c| {
            if let Some(index) = PIGPEN_LETTERS.chars().position(|letter| letter == c) {
                symbols[index].to_string()
            } else if c.is_whitespace() {
                "/".to_string()
            } else {
                c.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn symbol_decode(symbol_type: &str, text: &str) -> String {
    let symbols = if symbol_type == "dancingMen" {
        &DANCING_SYMBOLS
    } else {
        &PIGPEN_SYMBOLS
    };
    let letters: Vec<char> = PIGPEN_LETTERS.chars().collect();
    text.split_whitespace()
        .map(|token| {
            if token == "/" {
                " ".to_string()
            } else if let Some(index) = symbols.iter().position(|symbol| *symbol == token) {
                letters[index].to_string()
            } else {
                token.to_string()
            }
        })
        .collect()
}

fn columnar_rail_encode(text: &str, count: i32) -> String {
    let count = count.max(2) as usize;
    let chars = clean_no_ws(text);
    let rows = chars.len().div_ceil(count);
    let mut out = String::new();
    for col in 0..count {
        for row in 0..rows {
            if let Some(ch) = chars.get(row * count + col) {
                out.push(*ch);
            }
        }
    }
    out
}

fn columnar_rail_decode(text: &str, count: i32) -> String {
    let count = count.max(2) as usize;
    let chars = clean_no_ws(text);
    let rows = chars.len().div_ceil(count);
    let mut out = String::new();
    for row in 0..rows {
        for col in 0..count {
            if let Some(ch) = chars.get(col * rows + row) {
                out.push(*ch);
            }
        }
    }
    out
}

fn w_rail_encode(text: &str, rails: i32) -> String {
    let chars = clean_no_ws(text);
    let rails = rails.max(2) as usize;
    let cycle = 2 * rails - 2;
    let mut rows = vec![String::new(); rails];
    for (index, ch) in chars.into_iter().enumerate() {
        let pos = index % cycle;
        let row = pos.min(cycle - pos);
        rows[row].push(ch);
    }
    rows.concat()
}

fn w_rail_decode(text: &str, rails: i32) -> String {
    let chars = clean_no_ws(text);
    let rails = rails.max(2) as usize;
    let cycle = 2 * rails - 2;
    let mut counts = vec![0usize; rails];
    for index in 0..chars.len() {
        let pos = index % cycle;
        counts[pos.min(cycle - pos)] += 1;
    }
    let mut rows = Vec::new();
    let mut start = 0usize;
    for count in counts {
        rows.push(chars[start..start + count].to_vec());
        start += count;
    }
    let mut positions = vec![0usize; rails];
    let mut row = 0usize;
    let mut step = 1isize;
    let mut out = String::new();
    for _ in 0..chars.len() {
        if let Some(ch) = rows[row].get(positions[row]) {
            out.push(*ch);
        }
        positions[row] += 1;
        if row == rails - 1 {
            step = -1;
        } else if row == 0 {
            step = 1;
        }
        row = (row as isize + step) as usize;
    }
    out
}

fn cipher01248_encode(text: &str) -> String {
    let mut parts = Vec::new();
    for c in text.to_uppercase().chars() {
        let n = c as i32 - 64;
        if !(1..=26).contains(&n) {
            continue;
        }
        let mut num = n;
        let mut segment = String::new();
        for value in [8, 4, 2, 1] {
            let repeat = num / value;
            for _ in 0..repeat {
                segment.push_str(&value.to_string());
            }
            num %= value;
        }
        parts.push(segment);
    }
    parts.join("0")
}

fn cipher01248_decode(text: &str) -> String {
    text.split('0')
        .filter_map(|segment| {
            if segment.is_empty() {
                None
            } else {
                let sum: u32 = segment.chars().filter_map(|c| c.to_digit(10)).sum();
                (1..=26).contains(&sum).then(|| (b'A' + (sum as u8 - 1)) as char)
            }
        })
        .collect()
}

fn vowel_pairs() -> &'static [(char, &'static str)] {
    &[
        ('A', "1"),
        ('B', "11"),
        ('C', "12"),
        ('D', "13"),
        ('E', "2"),
        ('F', "21"),
        ('G', "22"),
        ('H', "23"),
        ('I', "3"),
        ('J', "31"),
        ('K', "32"),
        ('L', "33"),
        ('M', "34"),
        ('N', "35"),
        ('O', "4"),
        ('P', "41"),
        ('Q', "42"),
        ('R', "43"),
        ('S', "44"),
        ('T', "45"),
        ('U', "5"),
        ('V', "51"),
        ('W', "52"),
        ('X', "53"),
        ('Y', "54"),
        ('Z', "55"),
    ]
}

fn vowel_encode(text: &str) -> String {
    text.to_uppercase()
        .chars()
        .map(|c| {
            vowel_pairs()
                .iter()
                .find_map(|(k, v)| (*k == c).then_some(format!("{v} ")))
                .unwrap_or_else(|| c.to_string())
        })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn vowel_decode(text: &str) -> String {
    text.split_whitespace()
        .map(|code| {
            vowel_pairs()
                .iter()
                .find_map(|(k, v)| (*v == code).then_some(*k))
                .map(|c| c.to_string())
                .unwrap_or_else(|| code.to_string())
        })
        .collect()
}

fn ascii_convert(text: &str, input_type: &str, output_type: &str) -> String {
    if input_type == output_type {
        return text.to_string();
    }
    let decimals: Vec<Option<u32>> = match input_type {
        "char" => text.chars().map(|c| Some(c as u32)).collect(),
        "dec" => split_ascii_values(text)
            .into_iter()
            .map(|v| v.parse::<u32>().ok())
            .collect(),
        "hex" => split_ascii_values(text)
            .into_iter()
            .map(|v| u32::from_str_radix(v, 16).ok())
            .collect(),
        "oct" => split_ascii_values(text)
            .into_iter()
            .map(|v| u32::from_str_radix(v, 8).ok())
            .collect(),
        "bin" => split_ascii_values(text)
            .into_iter()
            .map(|v| u32::from_str_radix(v, 2).ok())
            .collect(),
        _ => Vec::new(),
    };
    decimals
        .into_iter()
        .map(|value| {
            let Some(value) = value else {
                return "请输入正确字符".to_string();
            };
            match output_type {
                "char" => char::from_u32(value).unwrap_or('\u{FFFD}').to_string(),
                "dec" => value.to_string(),
                "hex" => format!("{value:X}"),
                "oct" => format!("{value:o}"),
                "bin" => format!("{value:08b}"),
                _ => String::new(),
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

fn split_ascii_values(text: &str) -> Vec<&str> {
    text.split(|c| c == ' ' || c == ',')
        .filter(|v| !v.is_empty())
        .collect()
}

fn parse_code_maps(source: &str, char_key: &str, number_key: &str) -> CodeMaps {
    let char_marker = format!("\"{char_key}\"");
    let number_marker = format!("\"{number_key}\"");
    let mut rest = source;
    let mut maps = CodeMaps::default();
    while let Some(char_pos) = rest.find(&char_marker) {
        rest = &rest[char_pos + char_marker.len()..];
        let Some(colon) = rest.find(':') else {
            break;
        };
        let after_colon = rest[colon + 1..].trim_start();
        let Some(stripped) = after_colon.strip_prefix('"') else {
            continue;
        };
        let Some(end_quote) = stripped.find('"') else {
            continue;
        };
        let ch = stripped[..end_quote].to_string();
        rest = &stripped[end_quote + 1..];
        let Some(num_pos) = rest.find(&number_marker) else {
            continue;
        };
        rest = &rest[num_pos + number_marker.len()..];
        let Some(num_colon) = rest.find(':') else {
            continue;
        };
        let num_text: String = rest[num_colon + 1..]
            .trim_start()
            .chars()
            .take_while(|c| c.is_ascii_digit() || *c == '-')
            .collect();
        if let Ok(code) = num_text.parse::<i32>() {
            maps.code_to_char.insert(code, ch.clone());
            maps.char_to_code.insert(ch, code);
        }
    }
    maps
}

fn ccc_convert(text: &str) -> String {
    if text.trim().is_empty() {
        return String::new();
    }
    CCC_MAPS.with(|cell| {
        if cell.borrow().is_none() {
            *cell.borrow_mut() = Some(parse_code_maps(CCC_TABLE_JS, "CCCCharacter", "CCCnumber"));
        }
        let maps = cell.borrow();
        let maps = maps.as_ref().unwrap();
        if text.trim().chars().all(|c| c.is_ascii_digit() || c.is_whitespace()) {
            text.trim()
                .split_whitespace()
                .map(|code| {
                    let num = code.trim_start_matches('0').parse::<i32>().unwrap_or(0);
                    maps.code_to_char.get(&num).cloned().unwrap_or_else(|| code.to_string())
                })
                .collect::<String>()
        } else {
            convert_known_chars(text, |c| {
                maps.char_to_code
                    .get(&c.to_string())
                    .map(|code| format!("{code:04}"))
            })
        }
    })
}

fn four_ccc_convert(text: &str) -> String {
    if text.trim().is_empty() {
        return String::new();
    }
    FOUR_CCC_MAPS.with(|cell| {
        if cell.borrow().is_none() {
            *cell.borrow_mut() = Some(parse_code_maps(
                FOUR_CCC_TABLE_JS,
                "fourCCCCharacter",
                "fourCCCnumber",
            ));
        }
        let maps = cell.borrow();
        let maps = maps.as_ref().unwrap();
        if text.trim().chars().all(|c| c.is_ascii_digit() || c.is_whitespace()) {
            text.trim()
                .split_whitespace()
                .map(|code| {
                    let num = code.parse::<i32>().unwrap_or(0);
                    maps.code_to_char.get(&num).cloned().unwrap_or_else(|| code.to_string())
                })
                .collect::<String>()
        } else {
            convert_known_chars(text, |c| maps.char_to_code.get(&c.to_string()).map(|code| code.to_string()))
        }
    })
}

fn convert_known_chars(text: &str, mut lookup: impl FnMut(char) -> Option<String>) -> String {
    let mut out = Vec::new();
    let mut raw = String::new();
    for c in text.chars() {
        if let Some(converted) = lookup(c) {
            if !raw.is_empty() {
                out.push(std::mem::take(&mut raw));
            }
            out.push(converted);
        } else {
            raw.push(c);
        }
    }
    if !raw.is_empty() {
        out.push(raw);
    }
    out.join(" ")
}

fn rot_cipher(text: &str, method: &str) -> String {
    let ranges: &[(u32, u32)] = match method {
        "char" => &[(48, 57)],
        "dec" => &[(65, 90), (97, 122)],
        "hex" => &[(48, 57), (65, 90), (97, 122)],
        "oct" => &[(33, 126)],
        _ => &[],
    };
    text.chars()
        .map(|c| {
            let cp = c as u32;
            let mut out = cp;
            for (start, end) in ranges {
                if (*start..=*end).contains(&cp) {
                    let count = end - start + 1;
                    out = cp + count / 2;
                    if out > *end {
                        out -= count;
                    }
                    break;
                }
            }
            char::from_u32(out).unwrap_or(c)
        })
        .collect()
}

fn polybius_square(abc: &str, rows: &str, cols: &str) -> HashMap<char, String> {
    let mut map = HashMap::new();
    let mut abc_iter = abc.chars();
    for row in rows.chars() {
        for col in cols.chars() {
            let Some(ch) = abc_iter.next() else {
                return map;
            };
            map.insert(ch, format!("{row}{col}"));
        }
    }
    map
}

fn polybius_encode(text: &str, abc: &str, rows: &str, cols: &str) -> String {
    if abc.is_empty() || rows.is_empty() || cols.is_empty() {
        return "请配置字母表、行和列".to_string();
    }
    let square = polybius_square(abc, rows, cols);
    text.to_lowercase()
        .chars()
        .map(|ch| {
            if let Some(code) = square.get(&ch) {
                format!("{code} ")
            } else if ch == ' ' {
                "  ".to_string()
            } else {
                String::new()
            }
        })
        .collect::<String>()
        .trim()
        .to_string()
}

fn polybius_decode(text: &str, abc: &str, rows: &str, cols: &str) -> String {
    if abc.is_empty() || rows.is_empty() || cols.is_empty() {
        return "请配置字母表、行和列".to_string();
    }
    let square = polybius_square(abc, rows, cols);
    let reverse: HashMap<String, char> = square.into_iter().map(|(k, v)| (v, k)).collect();
    text.trim()
        .split_whitespace()
        .filter_map(|part| reverse.get(part).copied())
        .collect()
}

fn square5(key: &str) -> String {
    let mut seen = HashSet::new();
    format!("{key}ABCDEFGHIKLMNOPQRSTUVWXYZ")
        .to_uppercase()
        .replace('J', "I")
        .chars()
        .filter(|c| c.is_ascii_uppercase() && seen.insert(*c))
        .take(25)
        .collect()
}

fn clean5(text: &str) -> String {
    text.to_uppercase()
        .replace('J', "I")
        .chars()
        .filter(|c| c.is_ascii_uppercase())
        .collect()
}

fn poly_pairs(text: &str) -> Vec<(char, char)> {
    let chars: Vec<char> = clean5(text).chars().collect();
    let mut pairs = Vec::new();
    let mut index = 0usize;
    while index < chars.len() {
        pairs.push((chars[index], *chars.get(index + 1).unwrap_or(&'X')));
        index += 2;
    }
    pairs
}

fn pos5(square: &str, c: char) -> (usize, usize) {
    let index = square.chars().position(|x| x == c).unwrap_or(0);
    (index / 5, index % 5)
}

fn trifid_alpha(key: &str) -> String {
    let mut seen = HashSet::new();
    format!("{key}ABCDEFGHIJKLMNOPQRSTUVWXYZ.")
        .to_uppercase()
        .chars()
        .filter(|c| (c.is_ascii_uppercase() || *c == '.') && seen.insert(*c))
        .take(27)
        .collect()
}

fn trifid_coord(alpha: &str, c: char) -> [usize; 3] {
    let index = alpha.chars().position(|x| x == c).unwrap_or(0);
    [index / 9 + 1, (index % 9) / 3 + 1, index % 3 + 1]
}

fn trifid_char(alpha: &str, a: usize, b: usize, c: usize) -> char {
    alpha
        .chars()
        .nth((a - 1) * 9 + (b - 1) * 3 + c - 1)
        .unwrap_or('\0')
}

fn trifid_encode(text: &str, key: &str, period: i32) -> String {
    let alpha = trifid_alpha(key);
    let chars: Vec<char> = text
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_uppercase() || *c == '.')
        .collect();
    let period = period.max(1) as usize;
    let mut out = String::new();
    for block in chars.chunks(period) {
        let coords: Vec<[usize; 3]> = block.iter().map(|c| trifid_coord(&alpha, *c)).collect();
        let mut seq = Vec::new();
        seq.extend(coords.iter().map(|x| x[0]));
        seq.extend(coords.iter().map(|x| x[1]));
        seq.extend(coords.iter().map(|x| x[2]));
        for chunk in seq.chunks(3) {
            if chunk.len() == 3 {
                out.push(trifid_char(&alpha, chunk[0], chunk[1], chunk[2]));
            }
        }
    }
    out
}

fn trifid_decode(text: &str, key: &str, period: i32) -> String {
    let alpha = trifid_alpha(key);
    let chars: Vec<char> = text
        .to_uppercase()
        .chars()
        .filter(|c| c.is_ascii_uppercase() || *c == '.')
        .collect();
    let period = period.max(1) as usize;
    let mut out = String::new();
    for block in chars.chunks(period) {
        let seq: Vec<usize> = block
            .iter()
            .flat_map(|c| trifid_coord(&alpha, *c))
            .collect();
        let n = block.len();
        let a = &seq[0..n];
        let b = &seq[n..2 * n];
        let c = &seq[2 * n..];
        for index in 0..n {
            out.push(trifid_char(&alpha, a[index], b[index], c[index]));
        }
    }
    out
}

fn four_square_encode(text: &str, key_a: &str, key_b: &str) -> String {
    let normal = "ABCDEFGHIKLMNOPQRSTUVWXYZ";
    let sq_a = square5(key_a);
    let sq_b = square5(key_b);
    let a_chars: Vec<char> = sq_a.chars().collect();
    let b_chars: Vec<char> = sq_b.chars().collect();
    poly_pairs(text)
        .into_iter()
        .map(|(a, b)| {
            let (r1, c1) = pos5(normal, a);
            let (r2, c2) = pos5(normal, b);
            format!("{}{}", a_chars[r1 * 5 + c2], b_chars[r2 * 5 + c1])
        })
        .collect()
}

fn four_square_decode(text: &str, key_a: &str, key_b: &str) -> String {
    let normal: Vec<char> = "ABCDEFGHIKLMNOPQRSTUVWXYZ".chars().collect();
    let sq_a = square5(key_a);
    let sq_b = square5(key_b);
    let chars: Vec<char> = clean5(text).chars().collect();
    let mut out = String::new();
    for chunk in chars.chunks(2) {
        let (r1, c2) = pos5(&sq_a, chunk[0]);
        let (r2, c1) = pos5(&sq_b, *chunk.get(1).unwrap_or(&'X'));
        out.push(normal[r1 * 5 + c1]);
        out.push(normal[r2 * 5 + c2]);
    }
    out
}

fn two_square_encode(text: &str, key_a: &str, key_b: &str) -> String {
    let sq_a = square5(key_a);
    let sq_b = square5(key_b);
    let a_chars: Vec<char> = sq_a.chars().collect();
    let b_chars: Vec<char> = sq_b.chars().collect();
    poly_pairs(text)
        .into_iter()
        .map(|(a, b)| {
            let (r1, c1) = pos5(&sq_a, a);
            let (r2, c2) = pos5(&sq_b, b);
            format!("{}{}", a_chars[r1 * 5 + c2], b_chars[r2 * 5 + c1])
        })
        .collect()
}

fn two_square_decode(text: &str, key_a: &str, key_b: &str) -> String {
    let sq_a = square5(key_a);
    let sq_b = square5(key_b);
    let a_chars: Vec<char> = sq_a.chars().collect();
    let b_chars: Vec<char> = sq_b.chars().collect();
    let chars: Vec<char> = clean5(text).chars().collect();
    let mut out = String::new();
    for chunk in chars.chunks(2) {
        let (r1, c2) = pos5(&sq_a, chunk[0]);
        let (r2, c1) = pos5(&sq_b, *chunk.get(1).unwrap_or(&'X'));
        out.push(a_chars[r1 * 5 + c1]);
        out.push(b_chars[r2 * 5 + c2]);
    }
    out
}

fn nihilist_map(key: &str) -> (HashMap<char, i32>, HashMap<i32, char>) {
    let square = square5(key);
    let mut map = HashMap::new();
    let mut rev = HashMap::new();
    for (index, c) in square.chars().enumerate() {
        let n = ((index / 5) as i32 + 1) * 10 + (index % 5) as i32 + 1;
        map.insert(c, n);
        rev.insert(n, c);
    }
    (map, rev)
}

fn nihilist_encode(text: &str, key_a: &str, key_b: &str) -> String {
    let (map, _) = nihilist_map(key_a);
    let key_nums: Vec<i32> = clean5(if key_b.is_empty() { "KEY" } else { key_b })
        .chars()
        .filter_map(|c| map.get(&c).copied())
        .collect();
    if key_nums.is_empty() {
        return "密钥无效".to_string();
    }
    clean5(text)
        .chars()
        .enumerate()
        .filter_map(|(index, c)| map.get(&c).map(|value| value + key_nums[index % key_nums.len()]))
        .map(|value| value.to_string())
        .collect::<Vec<_>>()
        .join(" ")
}

fn nihilist_decode(text: &str, key_a: &str, key_b: &str) -> String {
    let (map, rev) = nihilist_map(key_a);
    let key_nums: Vec<i32> = clean5(if key_b.is_empty() { "KEY" } else { key_b })
        .chars()
        .filter_map(|c| map.get(&c).copied())
        .collect();
    if key_nums.is_empty() {
        return "密钥无效".to_string();
    }
    text.split_whitespace()
        .filter_map(|n| n.parse::<i32>().ok())
        .enumerate()
        .map(|(index, n)| rev.get(&(n - key_nums[index % key_nums.len()])).copied().unwrap_or('?'))
        .collect()
}

fn polybius_process(
    text: &str,
    variant: &str,
    abc: &str,
    rows: &str,
    cols: &str,
    key_a: &str,
    key_b: &str,
    period: i32,
) -> String {
    match variant {
        "trifid" => format!("加密: {}\n解密: {}", trifid_encode(text, key_a, period), trifid_decode(text, key_a, period)),
        "fourSquare" => format!("加密: {}\n解密: {}", four_square_encode(text, key_a, key_b), four_square_decode(text, key_a, key_b)),
        "twoSquare" => format!("加密: {}\n解密: {}", two_square_encode(text, key_a, key_b), two_square_decode(text, key_a, key_b)),
        "nihilist" => format!("加密: {}\n解密: {}", nihilist_encode(text, key_a, key_b), nihilist_decode(text, key_a, key_b)),
        _ => format!("加密: {} \n解密: {}", polybius_encode(text, abc, rows, cols), polybius_decode(text, abc, rows, cols)),
    }
}

fn playfair_square(key: &str) -> Vec<char> {
    let mut seen = HashSet::new();
    format!("{key}ABCDEFGHIKLMNOPQRSTUVWXYZ")
        .to_uppercase()
        .replace('J', "I")
        .chars()
        .filter(|c| c.is_ascii_uppercase() && seen.insert(*c))
        .collect()
}

fn playfair_pairs(text: &str) -> Vec<(char, char)> {
    let letters: Vec<char> = text
        .to_uppercase()
        .replace('J', "I")
        .chars()
        .filter(|c| c.is_ascii_uppercase())
        .collect();
    let mut pairs = Vec::new();
    let mut index = 0usize;
    while index < letters.len() {
        let a = letters[index];
        let b = *letters.get(index + 1).unwrap_or(&'X');
        if a == b {
            pairs.push((a, 'X'));
            index += 1;
        } else {
            pairs.push((a, b));
            index += 2;
        }
    }
    pairs
}

fn playfair_pos(square: &[char], c: char) -> (usize, usize) {
    let index = square.iter().position(|x| *x == c).unwrap_or(0);
    (index / 5, index % 5)
}

fn playfair_run_pair(square: &[char], a: char, b: char, dir: i32) -> String {
    let (ra, ca) = playfair_pos(square, a);
    let (rb, cb) = playfair_pos(square, b);
    if ra == rb {
        format!(
            "{}{}",
            square[ra * 5 + (ca as i32 + dir).rem_euclid(5) as usize],
            square[rb * 5 + (cb as i32 + dir).rem_euclid(5) as usize]
        )
    } else if ca == cb {
        format!(
            "{}{}",
            square[(ra as i32 + dir).rem_euclid(5) as usize * 5 + ca],
            square[(rb as i32 + dir).rem_euclid(5) as usize * 5 + cb]
        )
    } else {
        format!("{}{}", square[ra * 5 + cb], square[rb * 5 + ca])
    }
}

fn playfair_encode(text: &str, key: &str) -> String {
    let square = playfair_square(key);
    playfair_pairs(text)
        .into_iter()
        .map(|(a, b)| playfair_run_pair(&square, a, b, 1))
        .collect()
}

fn playfair_decode(text: &str, key: &str) -> String {
    let square = playfair_square(key);
    let letters: Vec<char> = text
        .to_uppercase()
        .replace('J', "I")
        .chars()
        .filter(|c| c.is_ascii_uppercase())
        .collect();
    let mut out = String::new();
    for chunk in letters.chunks(2) {
        out.push_str(&playfair_run_pair(
            &square,
            chunk[0],
            *chunk.get(1).unwrap_or(&'X'),
            -1,
        ));
    }
    out
}

fn adfgx_square(alpha: &str, cipher_type: &str) -> (HashMap<char, String>, String) {
    let is_adfgvx = cipher_type == "ADFVGX";
    let default_alpha = if is_adfgvx {
        "abcdefghijklmnopqrstuvwxyz0123456789"
    } else {
        "abcdefghiklmnopqrstuvwxyz"
    };
    let mut seen = HashSet::new();
    let mut valid_alpha: String = alpha
        .to_lowercase()
        .replace('j', "i")
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() && seen.insert(*c))
        .collect();
    for c in default_alpha.chars() {
        if !valid_alpha.contains(c) {
            valid_alpha.push(c);
        }
    }
    let size = if is_adfgvx { 36 } else { 25 };
    valid_alpha.truncate(size);
    let rows = if is_adfgvx { "ADFGVX" } else { "ADFGX" }.to_string();
    let row_chars: Vec<char> = rows.chars().collect();
    let width = row_chars.len();
    let mut square = HashMap::new();
    for (index, c) in valid_alpha.chars().enumerate() {
        square.insert(c, format!("{}{}", row_chars[index / width], row_chars[index % width]));
    }
    (square, rows)
}

fn adfgx_column_order(keyword: &str) -> Vec<usize> {
    let mut chars: Vec<(char, usize)> = keyword
        .chars()
        .enumerate()
        .map(|(index, c)| (c.to_ascii_lowercase(), index))
        .collect();
    chars.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));
    chars.into_iter().map(|(_, index)| index).collect()
}

fn adfgx_encrypt(text: &str, alpha: &str, keyword: &str, cipher_type: &str) -> String {
    let (square, rows) = adfgx_square(alpha, cipher_type);
    let coords: String = text
        .to_lowercase()
        .chars()
        .map(|c| if c == 'j' && cipher_type == "ADFGX" { 'i' } else { c })
        .filter_map(|c| square.get(&c).cloned())
        .collect();
    if keyword.is_empty() {
        return coords;
    }
    let key_len = keyword.chars().count();
    let chars: Vec<char> = coords.chars().collect();
    let mut out = String::new();
    for col in adfgx_column_order(keyword) {
        let mut index = col;
        while index < chars.len() {
            out.push(chars[index]);
            index += key_len;
        }
    }
    let _ = rows;
    out.as_bytes()
        .chunks(5)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or(""))
        .collect::<Vec<_>>()
        .join(" ")
}

fn adfgx_decrypt(text: &str, alpha: &str, keyword: &str, cipher_type: &str) -> String {
    let (square, rows) = adfgx_square(alpha, cipher_type);
    let reverse: HashMap<String, char> = square.into_iter().map(|(k, v)| (v, k)).collect();
    let column_order = adfgx_column_order(keyword);
    if column_order.is_empty() {
        return String::new();
    }
    let clean: Vec<char> = text
        .to_uppercase()
        .chars()
        .filter(|c| rows.contains(*c))
        .collect();
    let key_len = column_order.len();
    let total_len = clean.len();
    let mut result = vec!['\0'; total_len];
    let mut ptr = 0usize;
    for orig_col in column_order {
        let col_len = (total_len + key_len - 1 - orig_col) / key_len;
        for i in 0..col_len {
            let pos = orig_col + i * key_len;
            if pos < total_len {
                result[pos] = *clean.get(ptr).unwrap_or(&'\0');
                ptr += 1;
            }
        }
    }
    result
        .chunks(2)
        .filter_map(|chunk| {
            if chunk.len() == 2 {
                reverse.get(&chunk.iter().collect::<String>()).copied()
            } else {
                None
            }
        })
        .collect::<String>()
        .to_lowercase()
}

fn affine_mod_inv(a: i32, m: i32) -> Option<i32> {
    let a = a.rem_euclid(m);
    (1..m).find(|x| (a * x) % m == 1)
}

fn affine_encrypt(text: &str, alpha: &str, a: i32, b: i32) -> String {
    let chars: Vec<char> = alpha.chars().collect();
    let m = chars.len() as i32;
    text.chars()
        .map(|c| {
            let lower = c.to_ascii_lowercase();
            if let Some(index) = chars.iter().position(|x| *x == lower) {
                let target = chars[(a * index as i32 + b).rem_euclid(m) as usize];
                if c.is_ascii_uppercase() {
                    target.to_ascii_uppercase()
                } else {
                    target
                }
            } else {
                c
            }
        })
        .collect()
}

fn affine_decrypt(text: &str, alpha: &str, a: i32, b: i32) -> String {
    let chars: Vec<char> = alpha.chars().collect();
    let m = chars.len() as i32;
    let Some(inv) = affine_mod_inv(a, m) else {
        return "无解".to_string();
    };
    text.chars()
        .map(|c| {
            let lower = c.to_ascii_lowercase();
            if let Some(index) = chars.iter().position(|x| *x == lower) {
                let target = chars[(inv * (index as i32 - b)).rem_euclid(m) as usize];
                if c.is_ascii_uppercase() {
                    target.to_ascii_uppercase()
                } else {
                    target
                }
            } else {
                c
            }
        })
        .collect()
}

fn tap_encode(text: &str, tap_mark: &str, group_mark: &str, letter_mark: &str) -> String {
    let alphabet = "abcdefghijlmnopqrstuvwxyz";
    let clean: String = text
        .to_lowercase()
        .replace('k', "c")
        .chars()
        .filter(|c| c.is_ascii_lowercase())
        .collect();
    let mut out = String::new();
    for (index, c) in clean.chars().enumerate() {
        let Some(pos) = alphabet.chars().position(|x| x == c) else {
            continue;
        };
        if index > 0 {
            out.push_str(letter_mark);
        }
        out.push_str(&tap_mark.repeat(pos / 5 + 1));
        out.push_str(group_mark);
        out.push_str(&tap_mark.repeat(pos % 5 + 1));
    }
    out
}

fn count_substring(text: &str, needle: &str) -> usize {
    if needle.is_empty() {
        return 0;
    }
    text.matches(needle).count()
}

fn tap_decode(text: &str, tap_mark: &str, group_mark: &str, letter_mark: &str) -> String {
    if text.is_empty() {
        return String::new();
    }
    let alphabet: Vec<char> = "abcdefghijlmnopqrstuvwxyz".chars().collect();
    let mut out = String::new();
    for group in text.split(letter_mark) {
        if group.trim().is_empty() {
            continue;
        }
        let parts: Vec<&str> = group.split(group_mark).collect();
        if parts.len() != 2 {
            continue;
        }
        let row = count_substring(parts[0], tap_mark);
        let col = count_substring(parts[1], tap_mark);
        if !(1..=5).contains(&row) || !(1..=5).contains(&col) {
            continue;
        }
        let index = (row - 1) * 5 + (col - 1);
        if let Some(ch) = alphabet.get(index) {
            out.push(*ch);
        }
    }
    out
}

fn bifid_square(key: &str) -> String {
    let mut seen = HashSet::new();
    let mut out = String::new();
    for c in key
        .to_lowercase()
        .replace('j', "i")
        .chars()
        .filter(|c| c.is_ascii_lowercase())
        .chain("abcdefghiklmnopqrstuvwxyz".chars())
    {
        if seen.insert(c) {
            out.push(c);
        }
    }
    out
}

fn bifid_encode(text: &str, key: &str) -> String {
    let clean: Vec<char> = text
        .to_lowercase()
        .replace('j', "i")
        .chars()
        .filter(|c| c.is_ascii_lowercase())
        .collect();
    if clean.is_empty() {
        return String::new();
    }
    let square = bifid_square(key);
    let square_chars: Vec<char> = square.chars().collect();
    let mut rows = String::new();
    let mut cols = String::new();
    for c in clean {
        let pos = square.find(c).unwrap_or(0);
        rows.push(char::from_digit((pos / 5 + 1) as u32, 10).unwrap());
        cols.push(char::from_digit((pos % 5 + 1) as u32, 10).unwrap());
    }
    let digits: Vec<char> = format!("{rows}{cols}").chars().collect();
    let mut out = String::new();
    for chunk in digits.chunks(2) {
        if chunk.len() == 2 {
            let row = chunk[0].to_digit(10).unwrap_or(1) as usize - 1;
            let col = chunk[1].to_digit(10).unwrap_or(1) as usize - 1;
            out.push(square_chars[5 * row + col]);
        }
    }
    out
}

fn bifid_decode(text: &str, key: &str) -> String {
    let clean: Vec<char> = text
        .to_lowercase()
        .replace('j', "i")
        .chars()
        .filter(|c| c.is_ascii_lowercase())
        .collect();
    if clean.is_empty() {
        return String::new();
    }
    let square = bifid_square(key);
    let square_chars: Vec<char> = square.chars().collect();
    let mut coords = String::new();
    for c in &clean {
        let pos = square.find(*c).unwrap_or(0);
        coords.push(char::from_digit((pos / 5 + 1) as u32, 10).unwrap());
        coords.push(char::from_digit((pos % 5 + 1) as u32, 10).unwrap());
    }
    let split = clean.len();
    let rows: Vec<char> = coords[..split].chars().collect();
    let cols: Vec<char> = coords[split..].chars().collect();
    let mut out = String::new();
    for index in 0..clean.len() {
        let row = rows[index].to_digit(10).unwrap_or(1) as usize - 1;
        let col = cols[index].to_digit(10).unwrap_or(1) as usize - 1;
        out.push(square_chars[5 * row + col]);
    }
    out
}

fn base_cipher_encode(text: &str, kind: &str) -> String {
    let mode = kind.to_lowercase().trim_start_matches("base").to_string();
    let bytes = text.as_bytes();
    match mode.as_str() {
        "16" => bytes.iter().map(|b| format!("{b:02X}")).collect(),
        "32" => base32_encode(bytes),
        "64" => base64_encode(bytes),
        "58" => base58_encode(bytes),
        "85" => base85_encode(bytes),
        "91" => base91_encode(bytes),
        "100" => bytes
            .iter()
            .filter_map(|b| char::from_u32(128512 + *b as u32))
            .collect(),
        _ => format!("不支持的编码: base{mode}"),
    }
}

fn base_cipher_decode(text: &str, kind: &str) -> String {
    let mode = kind.to_lowercase().trim_start_matches("base").to_string();
    let bytes = match mode.as_str() {
        "16" => base16_decode(text),
        "32" => base32_decode(text),
        "64" => base64_decode(text),
        "58" => base58_decode(text),
        "85" => base85_decode(text),
        "91" => base91_decode(text),
        "100" => Ok(text
            .chars()
            .filter_map(|c| {
                let cp = c as u32;
                (128512..128768).contains(&cp).then_some((cp - 128512) as u8)
            })
            .collect()),
        _ => return format!("不支持的解码: base{mode}"),
    };
    match bytes {
        Ok(bytes) => String::from_utf8_lossy(&bytes).into_owned(),
        Err(message) => message,
    }
}

fn base16_decode(text: &str) -> Result<Vec<u8>, String> {
    if !text.chars().all(|c| c.is_ascii_hexdigit()) || text.len() % 2 != 0 {
        return Err("无效的Base16编码".to_string());
    }
    let mut out = Vec::new();
    for index in (0..text.len()).step_by(2) {
        out.push(u8::from_str_radix(&text[index..index + 2], 16).map_err(|_| "无效的Base16编码".to_string())?);
    }
    Ok(out)
}

fn base32_encode(bytes: &[u8]) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut out = String::new();
    let mut buffer = 0u32;
    let mut bits = 0usize;
    for byte in bytes {
        buffer = (buffer << 8) | *byte as u32;
        bits += 8;
        while bits >= 5 {
            bits -= 5;
            out.push(alphabet[((buffer >> bits) & 31) as usize] as char);
        }
    }
    if bits > 0 {
        out.push(alphabet[((buffer << (5 - bits)) & 31) as usize] as char);
    }
    while out.len() % 8 != 0 {
        out.push('=');
    }
    out
}

fn base32_decode(text: &str) -> Result<Vec<u8>, String> {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let clean = text.trim_end_matches('=').to_uppercase();
    if !clean.chars().all(|c| alphabet.contains(c)) {
        return Err("无效的Base32编码".to_string());
    }
    let mut out = Vec::new();
    let mut buffer = 0u32;
    let mut bits = 0usize;
    for c in clean.chars() {
        buffer = (buffer << 5) | alphabet.find(c).unwrap_or(0) as u32;
        bits += 5;
        while bits >= 8 {
            bits -= 8;
            out.push(((buffer >> bits) & 0xff) as u8);
        }
    }
    Ok(out)
}

fn base64_encode(bytes: &[u8]) -> String {
    const A: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);
        let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | b2 as u32;
        out.push(A[((n >> 18) & 63) as usize] as char);
        out.push(A[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { A[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { A[(n & 63) as usize] as char } else { '=' });
    }
    out
}

fn base64_decode(text: &str) -> Result<Vec<u8>, String> {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let clean: Vec<char> = text.chars().filter(|c| !c.is_whitespace()).collect();
    let mut out = Vec::new();
    for chunk in clean.chunks(4) {
        if chunk.len() < 4 {
            break;
        }
        let mut n = 0u32;
        let mut pad = 0usize;
        for c in chunk {
            n <<= 6;
            if *c == '=' {
                pad += 1;
            } else if let Some(value) = alphabet.find(*c) {
                n |= value as u32;
            } else {
                return Err("无效字符".to_string());
            }
        }
        out.push(((n >> 16) & 0xff) as u8);
        if pad < 2 {
            out.push(((n >> 8) & 0xff) as u8);
        }
        if pad < 1 {
            out.push((n & 0xff) as u8);
        }
    }
    Ok(out)
}

fn base58_encode(bytes: &[u8]) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    let alphabet: Vec<char> = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        .chars()
        .collect();
    let zeroes = bytes.iter().take_while(|b| **b == 0).count();
    let mut digits: Vec<u8> = bytes.to_vec();
    let mut out = Vec::new();
    while digits.iter().any(|b| *b != 0) {
        let mut quotient = Vec::new();
        let mut rem = 0u32;
        let mut started = false;
        for byte in &digits {
            let value = rem * 256 + *byte as u32;
            let q = value / 58;
            rem = value % 58;
            if q != 0 || started {
                quotient.push(q as u8);
                started = true;
            }
        }
        out.push(alphabet[rem as usize]);
        digits = if quotient.is_empty() { vec![0] } else { quotient };
    }
    "1".repeat(zeroes) + &out.into_iter().rev().collect::<String>()
}

fn base58_decode(text: &str) -> Result<Vec<u8>, String> {
    let alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let zeroes = text.chars().take_while(|c| *c == '1').count();
    let mut digits: Vec<u32> = text
        .chars()
        .skip(zeroes)
        .map(|c| alphabet.find(c).map(|v| v as u32).ok_or_else(|| "无效的Base58字符".to_string()))
        .collect::<Result<_, _>>()?;
    let mut out = Vec::new();
    while digits.iter().any(|d| *d != 0) {
        let mut quotient = Vec::new();
        let mut rem = 0u32;
        let mut started = false;
        for digit in &digits {
            let value = rem * 58 + *digit;
            let q = value / 256;
            rem = value % 256;
            if q != 0 || started {
                quotient.push(q);
                started = true;
            }
        }
        out.push(rem as u8);
        digits = if quotient.is_empty() { vec![0] } else { quotient };
    }
    out.reverse();
    let mut prefixed = vec![0; zeroes];
    prefixed.extend(out);
    Ok(prefixed)
}

fn base85_encode(bytes: &[u8]) -> String {
    let alphabet: Vec<char> =
        " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu"
            .chars()
            .skip(1)
            .collect();
    let mut out = Vec::new();
    for chunk in bytes.chunks(4) {
        let mut padded = [0u8; 4];
        for (index, byte) in chunk.iter().enumerate() {
            padded[index] = *byte;
        }
        let value = u32::from_be_bytes(padded);
        if value == 0 && chunk.len() == 4 {
            out.push('z');
            continue;
        }
        for index in 0..5 {
            let divisor = 85u32.pow(4 - index);
            out.push(alphabet[((value / divisor) % 85) as usize]);
        }
    }
    let pad = (4 - (bytes.len() % 4)) % 4;
    if pad > 0 {
        for _ in 0..pad {
            out.pop();
        }
    }
    out.into_iter().collect()
}

fn base85_decode(text: &str) -> Result<Vec<u8>, String> {
    let alphabet = "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
    let expanded = text.replace('z', "!!!!!");
    let chars: Vec<char> = expanded.chars().collect();
    let mut out = Vec::new();
    let full = chars.len() / 5 * 5;
    for chunk in chars[..full].chunks(5) {
        let mut value = 0u32;
        for c in chunk {
            value = value * 85 + alphabet.find(*c).unwrap_or(0) as u32;
        }
        out.extend(value.to_be_bytes());
    }
    let rem = chars.len() % 5;
    if rem > 0 {
        let chunk = &chars[full..];
        let mut value = 0u32;
        for c in chunk {
            value = value * 85 + alphabet.find(*c).unwrap_or(0) as u32;
        }
        for _ in rem..5 {
            value = value * 85 + 84;
        }
        let bytes = value.to_be_bytes();
        out.extend_from_slice(&bytes[..rem - 1]);
    }
    Ok(out)
}

fn base91_encode(bytes: &[u8]) -> String {
    let alphabet: Vec<char> =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\""
            .chars()
            .collect();
    let mut out = String::new();
    let mut n = 0usize;
    let mut value = 0u32;
    for byte in bytes {
        value |= (*byte as u32) << n;
        n += 8;
        if n > 13 {
            let mut code = value & 8191;
            if code > 88 {
                value >>= 13;
                n -= 13;
            } else {
                code = value & 16383;
                value >>= 14;
                n -= 14;
            }
            out.push(alphabet[(code % 91) as usize]);
            out.push(alphabet[(code / 91) as usize]);
        }
    }
    if n > 0 {
        out.push(alphabet[(value % 91) as usize]);
        if n > 7 || value > 90 {
            out.push(alphabet[(value / 91) as usize]);
        }
    }
    out
}

fn base91_decode(text: &str) -> Result<Vec<u8>, String> {
    let alphabet =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~\"";
    let chars: Vec<char> = text.chars().collect();
    let mut out = Vec::new();
    let mut value = 0u32;
    let mut n = 0i32;
    let mut index = 0usize;
    while index + 1 < chars.len() {
        let c1 = alphabet.find(chars[index]).unwrap_or(usize::MAX);
        let c2 = alphabet.find(chars[index + 1]).unwrap_or(usize::MAX);
        if c1 == usize::MAX || c2 == usize::MAX {
            index += 2;
            continue;
        }
        let val = (c1 + c2 * 91) as u32;
        if val >= 8192 {
            value |= val << n;
            out.push((value & 0xff) as u8);
            value >>= 8;
            n -= 8;
            out.push((value & 0xff) as u8);
            value >>= 8;
            n -= 8;
        } else {
            value |= val << n;
            out.push((value & 0xff) as u8);
            value >>= 8;
            n -= 8;
        }
        n += if val < 8192 { 13 } else { 14 };
        index += 2;
    }
    if chars.len() % 2 == 1 {
        if let Some(c) = alphabet.find(*chars.last().unwrap()) {
            value |= (c as u32) << n;
            while n >= 8 {
                out.push((value & 0xff) as u8);
                value >>= 8;
                n -= 8;
            }
        }
    }
    Ok(out)
}

fn init_symbol_cipher_panel() -> Result<(), JsValue> {
    let doc = document()?;
    let Some(input) = doc.get_element_by_id("symbolCipherInput") else {
        return Ok(());
    };
    let Some(panel) = doc.get_element_by_id("symbolCipherPanel") else {
        return Ok(());
    };
    let Some(kind) = doc.get_element_by_id("symbolCipherType") else {
        return Ok(());
    };
    let Some(refresh) = doc.get_element_by_id("symbolCipherRefresh") else {
        return Ok(());
    };
    let Some(backspace) = doc.get_element_by_id("symbolCipherBackspace") else {
        return Ok(());
    };
    if panel.get_attribute("data-rust-bound").as_deref() == Some("1") {
        render_symbol_cipher_result();
        return Ok(());
    }
    panel.set_attribute("data-rust-bound", "1")?;
    set_display(&panel, "none");

    let refresh_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Err(err) = build_symbol_cipher_panel() {
            console::error_1(&err);
        }
        render_symbol_cipher_result();
    }));
    refresh.add_event_listener_with_callback("click", refresh_closure.as_ref().unchecked_ref())?;
    refresh_closure.forget();

    let backspace_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Ok(document) = document() {
            if let Some(input) = document.get_element_by_id("symbolCipherInput") {
                let mut value = element_value(&input);
                value.pop();
                set_element_value(&input, &value);
                render_symbol_cipher_result();
                dispatch_input(&input);
            }
        }
    }));
    backspace.add_event_listener_with_callback("click", backspace_closure.as_ref().unchecked_ref())?;
    backspace_closure.forget();

    let input_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        render_symbol_cipher_result();
    }));
    input.add_event_listener_with_callback("input", input_closure.as_ref().unchecked_ref())?;
    input_closure.forget();

    let kind_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Ok(document) = document() {
            if let Some(panel) = document.get_element_by_id("symbolCipherPanel") {
                panel.set_inner_html("");
                set_display(&panel, "none");
            }
        }
        render_symbol_cipher_result();
    }));
    kind.add_event_listener_with_callback("change", kind_closure.as_ref().unchecked_ref())?;
    kind_closure.forget();

    render_symbol_cipher_result();
    Ok(())
}

fn render_symbol_cipher_result() {
    let text = value_by_id("symbolCipherInput", "");
    let kind = value_by_id("symbolCipherType", "pigpen");
    let result = if text.is_empty() {
        String::new()
    } else {
        format!(
            "编码: {}\n解码: {}",
            symbol_encode(&kind, &text),
            symbol_decode(&kind, &text)
        )
    };
    set_text("symbolCipherResult", &result);
}

fn build_symbol_cipher_panel() -> Result<(), JsValue> {
    let document = document()?;
    let Some(input) = document.get_element_by_id("symbolCipherInput") else {
        return Ok(());
    };
    let Some(panel) = document.get_element_by_id("symbolCipherPanel") else {
        return Ok(());
    };
    let kind = value_by_id("symbolCipherType", "pigpen");
    let symbols = if kind == "dancingMen" {
        &DANCING_SYMBOLS
    } else {
        &PIGPEN_SYMBOLS
    };
    let symbol_size = if kind == "dancingMen" { "1.05rem" } else { "1.45rem" };

    panel.set_inner_html("");
    set_display(&panel, "flex");
    set_style(
        &panel,
        "flex-wrap:wrap;gap:8px;justify-content:center;",
    );
    for (index, letter) in PIGPEN_LETTERS.chars().enumerate() {
        let tile = document.create_element("button")?;
        tile.set_attribute("type", "button")?;
        tile.set_attribute("title", &letter.to_string())?;
        set_style(
            &tile,
            "width:68px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(64,224,255,.45);border-radius:8px;background:rgba(15,27,51,.72);color:#fff;box-shadow:0 0 8px rgba(64,224,255,.16);cursor:pointer;transition:transform .15s ease,border-color .15s ease;",
        );
        let symbol = document.create_element("span")?;
        symbol.set_text_content(Some(symbols[index]));
        set_style(
            &symbol,
            &format!("font-size:{symbol_size};line-height:1;white-space:nowrap;"),
        );
        let label = document.create_element("span")?;
        label.set_text_content(Some(&letter.to_string()));
        set_style(&label, "font-size:.72rem;line-height:1;color:#40e0ff;");
        tile.append_child(&symbol)?;
        tile.append_child(&label)?;

        let tile_enter = tile.clone();
        let enter = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            set_style(
                &tile_enter,
                "width:68px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid #2ecc71;border-radius:8px;background:rgba(15,27,51,.72);color:#fff;box-shadow:0 0 8px rgba(64,224,255,.16);cursor:pointer;transition:transform .15s ease,border-color .15s ease;transform:translateY(-2px);",
            );
        }));
        tile.add_event_listener_with_callback("mouseenter", enter.as_ref().unchecked_ref())?;
        enter.forget();

        let tile_leave = tile.clone();
        let leave = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            set_style(
                &tile_leave,
                "width:68px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(64,224,255,.45);border-radius:8px;background:rgba(15,27,51,.72);color:#fff;box-shadow:0 0 8px rgba(64,224,255,.16);cursor:pointer;transition:transform .15s ease,border-color .15s ease;transform:translateY(0);",
            );
        }));
        tile.add_event_listener_with_callback("mouseleave", leave.as_ref().unchecked_ref())?;
        leave.forget();

        let input_click = input.clone();
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            let mut value = element_value(&input_click);
            value.push(letter);
            set_element_value(&input_click, &value);
            render_symbol_cipher_result();
            dispatch_input(&input_click);
        }));
        tile.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();

        panel.append_child(&tile)?;
    }

    let space_tile = document.create_element("button")?;
    space_tile.set_attribute("type", "button")?;
    space_tile.set_text_content(Some("空格 /"));
    set_style(
        &space_tile,
        "width:68px;height:64px;border:1px solid rgba(46,204,113,.55);border-radius:8px;background:rgba(15,27,51,.72);color:#fff;box-shadow:0 0 8px rgba(46,204,113,.16);cursor:pointer;",
    );
    let input_space = input;
    let space_click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        let mut value = element_value(&input_space);
        value.push(' ');
        set_element_value(&input_space, &value);
        render_symbol_cipher_result();
        dispatch_input(&input_space);
    }));
    space_tile.add_event_listener_with_callback("click", space_click.as_ref().unchecked_ref())?;
    space_click.forget();
    panel.append_child(&space_tile)?;
    Ok(())
}

fn init_qiyu_panel() -> Result<(), JsValue> {
    let doc = document()?;
    let Some(clear) = doc.get_element_by_id("qiyuClear") else {
        return Ok(());
    };
    let Some(input) = doc.get_element_by_id("qiyuInput") else {
        return Ok(());
    };
    let Some(kind) = doc.get_element_by_id("qiyuType") else {
        return Ok(());
    };
    if input.get_attribute("data-rust-qiyu-bound").as_deref() == Some("1") {
        return Ok(());
    }
    input.set_attribute("data-rust-qiyu-bound", "1")?;

    let clear_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Ok(document) = document() {
            if let Some(input) = document.get_element_by_id("qiyuInput") {
                set_element_value(&input, "");
            }
        }
        setup_qiyu_canvas();
        set_text("qiyuResult", "");
        schedule_update_all();
    }));
    clear.add_event_listener_with_callback("click", clear_closure.as_ref().unchecked_ref())?;
    clear_closure.forget();

    let input_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        update_qiyu_canvases_from_input();
        set_text("qiyuResult", "");
        schedule_update_all();
    }));
    input.add_event_listener_with_callback("input", input_closure.as_ref().unchecked_ref())?;
    input_closure.forget();

    let kind_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        setup_qiyu_canvas();
    }));
    kind.add_event_listener_with_callback("change", kind_closure.as_ref().unchecked_ref())?;
    kind_closure.forget();

    setup_qiyu_canvas();
    Ok(())
}

fn qiyu_maps(kind: &str) -> (HashMap<u32, char>, HashMap<char, u32>) {
    let source = if kind == "braille" {
        BRAILLE_BITS_TO_CHAR
    } else {
        SEMAPHORE_BITS_TO_CHAR
    };
    let mut bits_to_char = HashMap::new();
    let mut char_to_bits = HashMap::new();
    for (index, c) in source.chars().enumerate() {
        if !c.is_whitespace() {
            bits_to_char.insert(index as u32, c);
            char_to_bits.insert(c, index as u32);
        }
    }
    (bits_to_char, char_to_bits)
}

fn setup_qiyu_canvas() {
    QIYU_BITS.with(|bits| *bits.borrow_mut() = vec![0]);
    QIYU_ACTIVE.with(|active| active.set(0));
    if let Err(err) = update_qiyu_canvas_display() {
        console::error_1(&err);
    }
}

fn update_qiyu_canvas_display() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("qiyuCanvasContainer") else {
        return Ok(());
    };
    let kind = value_by_id("qiyuType", "semaphore");
    let (bits_to_char, _) = qiyu_maps(&kind);
    container.set_inner_html("");

    let bits = QIYU_BITS.with(|bits| bits.borrow().clone());
    let active = QIYU_ACTIVE.with(Cell::get);
    for (index, bit_value) in bits.iter().enumerate() {
        let wrapper = document.create_element("div")?;
        wrapper.set_class_name("canvas-wrapper");
        set_style(&wrapper, "position:relative;margin:5px;");

        let canvas: HtmlCanvasElement = document.create_element("canvas")?.unchecked_into();
        canvas.set_width(if kind == "semaphore" { 120 } else { 90 });
        canvas.set_height(120);
        canvas.set_id(&format!("{kind}Canvas_{index}"));
        canvas.set_attribute("data-index", &index.to_string())?;
        let border = if index == active {
            "opacity:1;border:2px solid #2ecc71;"
        } else if index < active {
            "opacity:.8;border:1px solid #3498db;"
        } else {
            "opacity:.6;border:1px dashed #3498db;"
        };
        set_style(&canvas.clone().into(), &format!("{border}border-radius:8px;"));

        if kind == "semaphore" {
            draw_semaphore_background(&canvas)?;
            if *bit_value > 0 {
                draw_semaphore_lines(&canvas, *bit_value)?;
            }
        } else {
            draw_braille_background(&canvas)?;
            if *bit_value > 0 {
                draw_braille_dots(&canvas, *bit_value)?;
            }
        }

        let canvas_click = canvas.clone();
        let kind_click = kind.clone();
        let click = Closure::<dyn FnMut(MouseEvent)>::wrap(Box::new(move |event: MouseEvent| {
            let idx = canvas_click
                .get_attribute("data-index")
                .and_then(|v| v.parse::<usize>().ok())
                .unwrap_or(0);
            QIYU_ACTIVE.with(|active| active.set(idx));
            let rect = canvas_click.get_bounding_client_rect();
            let x = event.client_x() as f64 - rect.left();
            let y = event.client_y() as f64 - rect.top();
            if kind_click == "semaphore" {
                handle_semaphore_click(idx, x, y);
            } else {
                handle_braille_click(idx, x, y);
            }
            let is_last = QIYU_BITS.with(|bits| idx == bits.borrow().len().saturating_sub(1));
            if is_last {
                QIYU_BITS.with(|bits| bits.borrow_mut().push(0));
            }
            if let Err(err) = update_qiyu_canvas_display() {
                console::error_1(&err);
            }
        }));
        canvas.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();

        let label = document.create_element("div")?;
        label.set_text_content(Some(&(index + 1).to_string()));
        set_style(&label, "position:absolute;bottom:0;left:0;background-color:rgba(0,0,0,.5);color:white;padding:2px 6px;border-bottom-left-radius:7px;font-size:10px;");

        if *bit_value > 0 {
            if let Some(ch) = bits_to_char.get(bit_value) {
                let char_label = document.create_element("div")?;
                char_label.set_text_content(Some(&ch.to_string()));
                set_style(&char_label, "position:absolute;top:0;right:0;background-color:rgba(0,0,0,.5);color:white;padding:2px 6px;border-top-right-radius:7px;font-size:10px;");
                wrapper.append_child(&char_label)?;
            }
        }

        wrapper.append_child(&canvas)?;
        wrapper.append_child(&label)?;
        container.append_child(&wrapper)?;
    }
    Ok(())
}

fn handle_semaphore_click(index: usize, x: f64, y: f64) {
    let dx = x - 60.0;
    let dy = y - 60.0;
    let radius = dx * dx + dy * dy;
    if !(4.0..=7200.0).contains(&radius) {
        return;
    }
    let mut angle = ((-dy).atan2(dx) * 4.0 / std::f64::consts::PI).round() as i32;
    if angle < 0 {
        angle += 8;
    }
    let new_bit = 1u32 << angle;
    QIYU_BITS.with(|bits| {
        let mut bits = bits.borrow_mut();
        if let Some(value) = bits.get_mut(index) {
            if *value & new_bit != 0 {
                *value &= !new_bit;
            } else if value.count_ones() >= 2 {
                *value = new_bit;
            } else {
                *value |= new_bit;
            }
        }
    });
    update_qiyu_result(index);
}

fn handle_braille_click(index: usize, x: f64, y: f64) {
    let mut angle = if x - 45.0 < 0.0 { 0 } else { 1 };
    if y < 40.0 {
        angle += 0;
    } else if y < 80.0 {
        angle += 2;
    } else {
        angle += 4;
    }
    QIYU_BITS.with(|bits| {
        if let Some(value) = bits.borrow_mut().get_mut(index) {
            *value ^= 1u32 << angle;
        }
    });
    update_qiyu_result(index);
}

fn update_qiyu_result(index: usize) {
    update_qiyu_input_from_canvases();
    let kind = value_by_id("qiyuType", "semaphore");
    let (bits_to_char, _) = qiyu_maps(&kind);
    let bits = QIYU_BITS.with(|bits| bits.borrow().get(index).copied().unwrap_or(0));
    let ch = bits_to_char.get(&bits).copied().unwrap_or(' ');
    set_text("qiyuResult", &format!("画布 {} 当前字符: {}", index + 1, ch));
    schedule_update_all();
}

fn update_qiyu_input_from_canvases() {
    let kind = value_by_id("qiyuType", "semaphore");
    let (bits_to_char, _) = qiyu_maps(&kind);
    let mut text = String::new();
    QIYU_BITS.with(|bits| {
        for bits in bits.borrow().iter() {
            if *bits > 0 {
                if let Some(ch) = bits_to_char.get(bits) {
                    text.push(*ch);
                }
            }
        }
    });
    if let Ok(document) = document() {
        if let Some(input) = document.get_element_by_id("qiyuInput") {
            set_element_value(&input, &text);
        }
    }
}

fn update_qiyu_canvases_from_input() {
    let kind = value_by_id("qiyuType", "semaphore");
    let (_, char_to_bits) = qiyu_maps(&kind);
    let text = value_by_id("qiyuInput", "").to_uppercase();
    let mut values = Vec::new();
    for c in text.chars() {
        if let Some(bits) = char_to_bits.get(&c) {
            values.push(*bits);
        }
    }
    if values.is_empty() {
        values.push(0);
    }
    values.push(0);
    let active = values.len().saturating_sub(2);
    QIYU_BITS.with(|bits| *bits.borrow_mut() = values);
    QIYU_ACTIVE.with(|cell| cell.set(active));
    if let Err(err) = update_qiyu_canvas_display() {
        console::error_1(&err);
    }
}

fn canvas_context(canvas: &HtmlCanvasElement) -> Result<CanvasRenderingContext2d, JsValue> {
    Ok(canvas
        .get_context("2d")?
        .ok_or_else(|| JsValue::from_str("2d canvas context missing"))?
        .dyn_into::<CanvasRenderingContext2d>()?)
}

fn draw_grid(ctx: &CanvasRenderingContext2d, width: f64, height: f64) {
    ctx.begin_path();
    ctx.set_stroke_style(&JsValue::from_str("rgba(52, 152, 219, 0.15)"));
    ctx.set_line_width(0.5);
    let mut y = 0.0;
    while y < height {
        ctx.move_to(0.0, y);
        ctx.line_to(width, y);
        y += 10.0;
    }
    let mut x = 0.0;
    while x < width {
        ctx.move_to(x, 0.0);
        ctx.line_to(x, height);
        x += 10.0;
    }
    ctx.stroke();
}

fn draw_semaphore_background(canvas: &HtmlCanvasElement) -> Result<(), JsValue> {
    let ctx = canvas_context(canvas)?;
    let width = canvas.width() as f64;
    let height = canvas.height() as f64;
    ctx.clear_rect(0.0, 0.0, width, height);
    ctx.set_fill_style(&JsValue::from_str("#0f1b33"));
    ctx.fill_rect(0.0, 0.0, width, height);
    draw_grid(&ctx, width, height);
    let pts = [
        (90.0, 50.0),
        (78.0, 22.0),
        (50.0, 10.0),
        (22.0, 22.0),
        (10.0, 50.0),
        (22.0, 78.0),
        (50.0, 90.0),
        (78.0, 78.0),
    ];
    ctx.begin_path();
    ctx.set_stroke_style(&JsValue::from_str("#1e88e5"));
    ctx.set_line_width(1.5);
    for (x, y) in pts {
        ctx.move_to(60.0, 60.0);
        ctx.line_to(x * 1.2, y * 1.2);
    }
    ctx.stroke();
    ctx.begin_path();
    ctx.arc(60.0, 60.0, 4.0, 0.0, 2.0 * std::f64::consts::PI)?;
    ctx.set_fill_style(&JsValue::from_str("#2ecc71"));
    ctx.fill();
    ctx.begin_path();
    ctx.arc(60.0, 60.0, 6.0, 0.0, 2.0 * std::f64::consts::PI)?;
    ctx.set_stroke_style(&JsValue::from_str("#2ecc71"));
    ctx.set_line_width(1.0);
    ctx.stroke();
    Ok(())
}

fn draw_semaphore_lines(canvas: &HtmlCanvasElement, bits: u32) -> Result<(), JsValue> {
    let ctx = canvas_context(canvas)?;
    let pts = [
        (90.0, 50.0),
        (78.0, 22.0),
        (50.0, 10.0),
        (22.0, 22.0),
        (10.0, 50.0),
        (22.0, 78.0),
        (50.0, 90.0),
        (78.0, 78.0),
    ];
    for (index, (x, y)) in pts.iter().enumerate() {
        if bits & (1 << index) != 0 {
            ctx.begin_path();
            ctx.move_to(60.0, 60.0);
            ctx.line_to(x * 1.2, y * 1.2);
            ctx.set_stroke_style(&JsValue::from_str("rgba(46, 204, 113, 0.4)"));
            ctx.set_line_width(8.0);
            ctx.stroke();
        }
    }
    ctx.begin_path();
    for (index, (x, y)) in pts.iter().enumerate() {
        if bits & (1 << index) != 0 {
            ctx.move_to(60.0, 60.0);
            ctx.line_to(x * 1.2, y * 1.2);
        }
    }
    let gradient = ctx.create_linear_gradient(0.0, 0.0, canvas.width() as f64, canvas.height() as f64);
    gradient.add_color_stop(0.0, "#00bcd4")?;
    gradient.add_color_stop(1.0, "#2ecc71")?;
    ctx.set_stroke_style(gradient.as_ref());
    ctx.set_line_width(3.0);
    ctx.stroke();
    for (index, (x, y)) in pts.iter().enumerate() {
        if bits & (1 << index) != 0 {
            ctx.begin_path();
            ctx.arc(x * 1.2, y * 1.2, 3.0, 0.0, 2.0 * std::f64::consts::PI)?;
            ctx.set_fill_style(&JsValue::from_str("#2ecc71"));
            ctx.fill();
        }
    }
    Ok(())
}

fn draw_braille_background(canvas: &HtmlCanvasElement) -> Result<(), JsValue> {
    let ctx = canvas_context(canvas)?;
    let width = canvas.width() as f64;
    let height = canvas.height() as f64;
    ctx.clear_rect(0.0, 0.0, width, height);
    ctx.set_fill_style(&JsValue::from_str("#0f1b33"));
    ctx.fill_rect(0.0, 0.0, width, height);
    draw_grid(&ctx, width, height);
    let pts = braille_points(width);
    for (x, y) in pts {
        ctx.begin_path();
        ctx.arc(x, y, 8.4, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.set_line_width(1.5);
        ctx.set_stroke_style(&JsValue::from_str("#3498db"));
        ctx.stroke();
        ctx.set_fill_style(&JsValue::from_str("rgba(52, 152, 219, 0.15)"));
        ctx.fill();
    }
    Ok(())
}

fn draw_braille_dots(canvas: &HtmlCanvasElement, bits: u32) -> Result<(), JsValue> {
    let ctx = canvas_context(canvas)?;
    let pts = braille_points(canvas.width() as f64);
    for (index, (x, y)) in pts.iter().enumerate() {
        ctx.begin_path();
        ctx.arc(*x, *y, 8.4, 0.0, 2.0 * std::f64::consts::PI)?;
        ctx.set_line_width(1.5);
        ctx.set_stroke_style(&JsValue::from_str(if bits & (1 << index) != 0 {
            "#2ecc71"
        } else {
            "#3498db"
        }));
        ctx.stroke();
    }
    for (index, (x, y)) in pts.iter().enumerate() {
        if bits & (1 << index) != 0 {
            ctx.begin_path();
            ctx.arc(*x, *y, 10.8, 0.0, 2.0 * std::f64::consts::PI)?;
            ctx.set_fill_style(&JsValue::from_str("rgba(46, 204, 113, 0.2)"));
            ctx.fill();
            ctx.begin_path();
            ctx.arc(*x, *y, 8.4, 0.0, 2.0 * std::f64::consts::PI)?;
            let gradient = ctx.create_radial_gradient(*x, *y, 0.0, *x, *y, 8.4)?;
            gradient.add_color_stop(0.0, "#2ecc71")?;
            gradient.add_color_stop(1.0, "#00bcd4")?;
            ctx.set_fill_style(gradient.as_ref());
            ctx.fill();
            ctx.begin_path();
            ctx.arc(*x - 2.0, *y - 2.0, 2.0, 0.0, 2.0 * std::f64::consts::PI)?;
            ctx.set_fill_style(&JsValue::from_str("rgba(255, 255, 255, 0.7)"));
            ctx.fill();
        }
    }
    Ok(())
}

fn braille_points(width: f64) -> [(f64, f64); 6] {
    let x_offset = 24.0;
    [
        (x_offset / 100.0 * width, 18.0),
        ((100.0 - x_offset) / 100.0 * width, 18.0),
        (x_offset / 100.0 * width, 60.0),
        ((100.0 - x_offset) / 100.0 * width, 60.0),
        (x_offset / 100.0 * width, 102.0),
        ((100.0 - x_offset) / 100.0 * width, 102.0),
    ]
}

fn clear_cipher_results() -> Result<(), JsValue> {
    for result in elements("#mimaqu .result, #xiandaiqu .result")? {
        result.set_text_content(Some(""));
    }
    Ok(())
}

fn is_cipher_lab_visible() -> bool {
    let Ok(document) = document() else {
        return false;
    };
    document
        .get_element_by_id("jiamishiyanshi-content")
        .map(|section| {
            section
                .dyn_ref::<HtmlElement>()
                .map(|html| html.style().get_property_value("display").unwrap_or_default() != "none")
                .unwrap_or(true)
        })
        .unwrap_or(true)
}

fn active_cipher_submodule() -> Option<String> {
    document()
        .ok()?
        .query_selector("#jiamishiyanshi-content .submodule.active")
        .ok()
        .flatten()
        .map(|element| element.id())
}

fn int_value(id: &str, fallback: i32) -> i32 {
    value_by_id(id, "")
        .parse::<i32>()
        .unwrap_or(fallback)
}

fn non_empty_value(id: &str, fallback: &str) -> String {
    let value = value_by_id(id, fallback);
    if value.is_empty() {
        fallback.to_string()
    } else {
        value
    }
}

fn value_by_id(id: &str, fallback: &str) -> String {
    document()
        .ok()
        .and_then(|document| document.get_element_by_id(id))
        .map(|element| element_value(&element))
        .filter(|value| !value.is_empty() || fallback.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

fn query_value(selector: &str) -> Option<String> {
    document()
        .ok()?
        .query_selector(selector)
        .ok()
        .flatten()
        .map(|element| element_value(&element))
}

fn element_value(element: &Element) -> String {
    Reflect::get(element.as_ref(), &JsValue::from_str("value"))
        .ok()
        .and_then(|value| value.as_string())
        .unwrap_or_default()
}

fn set_element_value(element: &Element, value: &str) {
    let _ = Reflect::set(
        element.as_ref(),
        &JsValue::from_str("value"),
        &JsValue::from_str(value),
    );
}

fn set_text(id: &str, text: &str) {
    if let Ok(document) = document() {
        if let Some(element) = document.get_element_by_id(id) {
            element.set_text_content(Some(text));
        }
    }
}

fn set_display(element: &Element, value: &str) {
    if let Some(html) = element.dyn_ref::<HtmlElement>() {
        let _ = html.style().set_property("display", value);
    }
}

fn set_style(element: &Element, value: &str) {
    let _ = element.set_attribute("style", value);
}

fn dispatch_input(element: &Element) {
    if let Ok(event) = Event::new("input") {
        let _ = element.dispatch_event(&event);
    }
}

fn request_animation_frame(f: impl FnOnce() + 'static) {
    if let Ok(win) = window() {
        let closure = Closure::<dyn FnMut()>::once(f);
        let _ = win.request_animation_frame(closure.as_ref().unchecked_ref());
        closure.forget();
    }
}

fn elements(selector: &str) -> Result<Vec<Element>, JsValue> {
    let list = document()?.query_selector_all(selector)?;
    let mut out = Vec::with_capacity(list.length() as usize);
    for index in 0..list.length() {
        if let Some(node) = list.item(index) {
            out.push(node.unchecked_into::<Element>());
        }
    }
    Ok(out)
}

fn document() -> Result<Document, JsValue> {
    window()?
        .document()
        .ok_or_else(|| JsValue::from_str("document is missing"))
}

fn window() -> Result<Window, JsValue> {
    web_sys::window().ok_or_else(|| JsValue::from_str("window is missing"))
}
