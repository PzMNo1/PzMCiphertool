use std::cell::RefCell;
use std::collections::{HashSet, VecDeque};
use std::future::Future;

use js_sys::{Array, Function, Object, Promise, Reflect};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{future_to_promise, spawn_local, JsFuture};
use web_sys::{
    console, Document, DomParser, Element, Event, HtmlElement, HtmlInputElement,
    HtmlScriptElement, HtmlTextAreaElement, KeyboardEvent, Node, Response, SupportedType, Window,
};

const LOAD_VERSION: &str = "20260531";

const WORDSEARCH_HTML: &str = r#"
<div class="cihuimodule-header">
    <div class="cihuineon-title">词汇区</div>
    <div class="cihuineon-subtitle">NUTRIMATIC WORD PATTERN SEARCH</div>
</div>
<div class="cihui-layout-wrapper">
    <div class="card main-input cyber-border">
        <div class="cihuiinput-group">
            <input id="patternInput" class="cihuiinput" type="text" placeholder="输入模式，例如: a?ple / [abc]* / ..ing" autocomplete="off">
        </div>
        <button id="cihui-search-btn" class="cihuibtn" type="button">搜索词库</button>
        <div id="loader" class="cihuiloader" aria-live="polite">
            <span></span><span></span><span></span>
        </div>
        <div class="cihuiresult-container">
            <span class="cihuiresult-label">搜索结果</span>
            <div class="result" id="resultOutput"></div>
            <div id="paginationControls" class="cihuipagination-controls" style="display:none;">
                <button id="prevPageBtn" class="cihuipage-btn disabled" type="button">上一页</button>
                <button id="nextPageBtn" class="cihuipage-btn disabled" type="button">下一页</button>
            </div>
        </div>
    </div>
    <div class="card cyber-border cihui-tip-panel">
        <div class="badge">PATTERN NOTES</div>
        <div class="cihui-tip-content">? 匹配单个字符
* 匹配任意长度
[abc] 匹配候选字符
点击结果词条可复制</div>
    </div>
</div>
<div id="cihuitoast" role="status" aria-live="polite"></div>
"#;

thread_local! {
    static WORDSEARCH_STATE: RefCell<WordSearchState> = RefCell::new(WordSearchState::default());
    static LOADED_SCRIPTS: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
    static LOGIC_LOADED: RefCell<HashSet<&'static str>> = RefCell::new(HashSet::new());
    static SPACE_INITIALIZED: RefCell<HashSet<&'static str>> = RefCell::new(HashSet::new());
    static STANDARD_CUBE_API: RefCell<Option<StandardCubeApi>> = RefCell::new(None);
    static YINYANG_STATE: RefCell<YinYangState> = RefCell::new(YinYangState::new());
    static STARBATTLE_STATE: RefCell<StarBattleState> = RefCell::new(StarBattleState::new());
    static STARBATTLE_DRAG: RefCell<Option<bool>> = RefCell::new(None);
    static SHIKAKU_STATE: RefCell<ShikakuState> = RefCell::new(ShikakuState::new());
    static RIPPLE_STATE: RefCell<RippleState> = RefCell::new(RippleState::new());
    static RIPPLE_DRAG: RefCell<Option<bool>> = RefCell::new(None);
    static TENTS_STATE: RefCell<TentsState> = RefCell::new(TentsState::new());
    static SKYSCRAPERS_STATE: RefCell<SkyscrapersState> = RefCell::new(SkyscrapersState::new());
    static TREN_STATE: RefCell<TrenState> = RefCell::new(TrenState::new());
    static MINESWEEPER_STATE: RefCell<MinesweeperState> = RefCell::new(MinesweeperState::new());
    static BINAIRO_STATE: RefCell<BinairoState> = RefCell::new(BinairoState::new());
    static TATAMIBARI_STATE: RefCell<TatamibariState> = RefCell::new(TatamibariState::new());
    static YAJISAN_STATE: RefCell<YajisanState> = RefCell::new(YajisanState::new());
    static SUDOKU_STATE: RefCell<SudokuState> = RefCell::new(SudokuState::new());
    static SUDOKU_HISTORY: RefCell<Vec<Vec<Option<u8>>>> = RefCell::new(Vec::new());
    static AKARI_STATE: RefCell<AkariState> = RefCell::new(AkariState::new());
}

#[derive(Default)]
struct WordSearchState {
    query: String,
    current_start: String,
    history: Vec<String>,
    next_start: Option<String>,
}

struct WordSearchResult {
    lines: Vec<String>,
    next_start: Option<String>,
}

#[derive(Clone)]
struct YinYangState {
    size: usize,
    grid: Vec<Vec<u8>>,
    solutions: Vec<Vec<Vec<u8>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl YinYangState {
    fn new() -> Self {
        Self {
            size: 6,
            grid: empty_yinyang_grid(6),
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum StarBattleMode {
    Edit,
    Star,
}

#[derive(Clone)]
struct StarBattleState {
    rows: usize,
    cols: usize,
    stars: usize,
    user_stars: Vec<Vec<bool>>,
    h_boundaries: Vec<Vec<bool>>,
    v_boundaries: Vec<Vec<bool>>,
    mode: StarBattleMode,
    solutions: Vec<Vec<Vec<u8>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl StarBattleState {
    fn new() -> Self {
        let rows = 5;
        let cols = 5;
        Self {
            rows,
            cols,
            stars: 1,
            user_stars: empty_bool_grid(rows, cols),
            h_boundaries: empty_bool_grid(rows, cols),
            v_boundaries: empty_bool_grid(rows, cols),
            mode: StarBattleMode::Edit,
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone)]
struct ShikakuState {
    rows: usize,
    cols: usize,
    clues: Vec<Vec<Option<usize>>>,
    solutions: Vec<Vec<Vec<usize>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl ShikakuState {
    fn new() -> Self {
        let rows = 7;
        let cols = 7;
        Self {
            rows,
            cols,
            clues: empty_option_grid(rows, cols),
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum RippleMode {
    Boundary,
    Number,
}

#[derive(Clone)]
struct RippleState {
    rows: usize,
    cols: usize,
    clues: Vec<Vec<Option<usize>>>,
    h_boundaries: Vec<Vec<bool>>,
    v_boundaries: Vec<Vec<bool>>,
    mode: RippleMode,
    solutions: Vec<Vec<Vec<usize>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl RippleState {
    fn new() -> Self {
        let rows = 6;
        let cols = 6;
        Self {
            rows,
            cols,
            clues: empty_option_grid(rows, cols),
            h_boundaries: empty_bool_grid(rows, cols),
            v_boundaries: empty_bool_grid(rows, cols),
            mode: RippleMode::Boundary,
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone)]
struct TentsState {
    rows: usize,
    cols: usize,
    grid: Vec<Vec<u8>>,
    row_clues: Vec<Option<usize>>,
    col_clues: Vec<Option<usize>>,
    solutions: Vec<Vec<Vec<u8>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl TentsState {
    fn new() -> Self {
        let rows = 8;
        let cols = 8;
        Self {
            rows,
            cols,
            grid: vec![vec![0; cols]; rows],
            row_clues: vec![None; rows],
            col_clues: vec![None; cols],
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum SkyscrapersCellKind {
    Corner,
    Clue,
    Inner,
}

#[derive(Clone)]
struct SkyscrapersState {
    size: usize,
    values: Vec<Vec<Option<usize>>>,
    selected: Option<(usize, usize)>,
    solutions: Vec<Vec<Vec<usize>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl SkyscrapersState {
    fn new() -> Self {
        let size = 4;
        Self {
            size,
            values: vec![vec![None; size + 2]; size + 2],
            selected: None,
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone)]
struct TrenState {
    rows: usize,
    cols: usize,
    clues: Vec<Vec<Option<usize>>>,
    solutions: Vec<Vec<Vec<usize>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl TrenState {
    fn new() -> Self {
        let rows = 6;
        let cols = 6;
        Self {
            rows,
            cols,
            clues: empty_option_grid(rows, cols),
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone)]
struct MinesweeperState {
    rows: usize,
    cols: usize,
    clues: Vec<Vec<Option<usize>>>,
    solutions: Vec<Vec<Vec<bool>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl MinesweeperState {
    fn new() -> Self {
        let rows = 5;
        let cols = 5;
        Self {
            rows,
            cols,
            clues: empty_option_grid(rows, cols),
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy)]
struct BinairoCell {
    value: Option<u8>,
    fixed: bool,
}

#[derive(Clone)]
struct BinairoState {
    rows: usize,
    cols: usize,
    grid: Vec<Vec<BinairoCell>>,
    solutions: Vec<Vec<Vec<u8>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl BinairoState {
    fn new() -> Self {
        let rows = 10;
        let cols = 10;
        Self {
            rows,
            cols,
            grid: empty_binairo_grid(rows, cols),
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum TatamibariSymbol {
    Square,
    Horizontal,
    Vertical,
}

#[derive(Clone)]
struct TatamibariState {
    rows: usize,
    cols: usize,
    clues: Vec<Vec<Option<TatamibariSymbol>>>,
    current_symbol: TatamibariSymbol,
    solutions: Vec<Vec<Vec<isize>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl TatamibariState {
    fn new() -> Self {
        let rows = 6;
        let cols = 6;
        Self {
            rows,
            cols,
            clues: vec![vec![None; cols]; rows],
            current_symbol: TatamibariSymbol::Square,
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum YajisanDirection {
    Up,
    Down,
    Left,
    Right,
}

#[derive(Clone, Copy)]
struct YajisanClue {
    value: usize,
    direction: YajisanDirection,
}

#[derive(Clone)]
struct YajisanState {
    rows: usize,
    cols: usize,
    clues: Vec<Vec<Option<YajisanClue>>>,
    solutions: Vec<Vec<Vec<u8>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl YajisanState {
    fn new() -> Self {
        let rows = 7;
        let cols = 7;
        Self {
            rows,
            cols,
            clues: vec![vec![None; cols]; rows],
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone)]
struct SudokuState {
    values: Vec<Option<u8>>,
    fixed: Vec<bool>,
    diagonal: bool,
    solutions: Vec<Vec<u8>>,
    solution_index: usize,
    showing_solution: bool,
}

impl SudokuState {
    fn new() -> Self {
        Self {
            values: vec![None; 81],
            fixed: vec![false; 81],
            diagonal: false,
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum AkariCell {
    Empty,
    Wall,
    Clue(u8),
}

#[derive(Clone)]
struct AkariState {
    size: usize,
    grid: Vec<Vec<AkariCell>>,
    solutions: Vec<Vec<Vec<bool>>>,
    solution_index: usize,
    showing_solution: bool,
}

impl AkariState {
    fn new() -> Self {
        let size = 10;
        Self {
            size,
            grid: vec![vec![AkariCell::Empty; size]; size],
            solutions: Vec::new(),
            solution_index: 0,
            showing_solution: false,
        }
    }
}

struct LogicPuzzle {
    id: &'static str,
    label: &'static str,
    init: &'static str,
    scripts: &'static [&'static str],
}

struct SpacePuzzle {
    id: &'static str,
    label: &'static str,
    script: &'static str,
}

#[derive(Clone)]
struct StandardCubeApi {
    init: JsValue,
    open: JsValue,
}

const LOGIC_PUZZLES: &[LogicPuzzle] = &[
    LogicPuzzle { id: "sudoku", label: "数独", init: "initSudokuGrid", scripts: &[] },
    LogicPuzzle { id: "akari", label: "Akari", init: "initAkariGrid", scripts: &[] },
    LogicPuzzle { id: "aqre", label: "Aqre", init: "initAqreGrid", scripts: &["./logic/logicdiv/3_aqre_ui.js", "./logic/js/3_Aqre.js"] },
    LogicPuzzle { id: "aquapelago", label: "Aquapelago", init: "initAquapelagoGrid", scripts: &["./logic/logicdiv/4_aquapelago_ui.js", "./logic/js/4_aquapelago.js"] },
    LogicPuzzle { id: "aquarium", label: "Aquarium", init: "initAquariumGrid", scripts: &["./logic/logicdiv/5_aquarium_ui.js", "./logic/js/5_aquarium.js"] },
    LogicPuzzle { id: "balanceloop", label: "Balanceloop", init: "initBalanceloopGrid", scripts: &["./logic/logicdiv/6_balanceloop_ui.js", "./logic/js/6_balanceloop.js"] },
    LogicPuzzle { id: "battleship", label: "Battleship", init: "initBattleshipGrid", scripts: &["./logic/logicdiv/7_battleship_ui.js", "./logic/js/7_battleship.js"] },
    LogicPuzzle { id: "binairo", label: "Binairo", init: "initBinairoGrid", scripts: &[] },
    LogicPuzzle { id: "castlewall", label: "Castlewall", init: "initCastlewallGrid", scripts: &["./logic/logicdiv/9_castlewall_ui.js", "./logic/js/9_castlewall.js"] },
    LogicPuzzle { id: "cave", label: "Cave", init: "initCaveGrid", scripts: &["./logic/logicdiv/10_cave_ui.js", "./logic/js/10_cave.js"] },
    LogicPuzzle { id: "chocobanana", label: "Chocobanana", init: "initChocobananaGrid", scripts: &["./logic/logicdiv/11_chocobanana_ui.js", "./logic/js/11_chocobanana.js"] },
    LogicPuzzle { id: "chocona", label: "Chocona", init: "initChoconaGrid", scripts: &["./logic/logicdiv/12_chocona_ui.js", "./logic/js/12_chocona.js"] },
    LogicPuzzle { id: "countryroad", label: "Countryroad", init: "initCountryroadGrid", scripts: &["./logic/logicdiv/13_countryroad_ui.js", "./logic/js/13_countryroad.js"] },
    LogicPuzzle { id: "doppelblock", label: "Doppelblock", init: "initDoppelblockGrid", scripts: &["./logic/logicdiv/14_doppelblock_ui.js", "./logic/js/14_doppelblock.js"] },
    LogicPuzzle { id: "easyas", label: "Easyas", init: "initEasyasGrid", scripts: &["./logic/logicdiv/15_easyas_ui.js", "./logic/js/15_easyas.js"] },
    LogicPuzzle { id: "fillomino", label: "Fillomino", init: "initFillominoGrid", scripts: &["./logic/logicdiv/16_fillomino_ui.js", "./logic/js/16_fillomino.js"] },
    LogicPuzzle { id: "gokigen", label: "Gokigen", init: "initGokigenGrid", scripts: &["./logic/logicdiv/19_gokigen_ui.js", "./logic/js/19_gokigen.js"] },
    LogicPuzzle { id: "haisu", label: "Haisu", init: "initHaisuGrid", scripts: &["./logic/logicdiv/20_haisu_ui.js", "./logic/js/20_haisu.js"] },
    LogicPuzzle { id: "haisuslow", label: "Haisuslow", init: "initHaisuslowGrid", scripts: &["./logic/logicdiv/21_haisuslow_ui.js", "./logic/js/21_haisuslow.js"] },
    LogicPuzzle { id: "hamle", label: "Hamle", init: "initHamleGrid", scripts: &["./logic/logicdiv/22_hamle_ui.js", "./logic/js/22_hamle.js"] },
    LogicPuzzle { id: "hashi", label: "Hashi", init: "initHashiGrid", scripts: &["./logic/logicdiv/23_hashi_ui.js", "./logic/js/23_hashi.js"] },
    LogicPuzzle { id: "heteromino", label: "Heteromino", init: "initHeterominoGrid", scripts: &["./logic/logicdiv/24_heteromino_ui.js", "./logic/js/24_heteromino.js"] },
    LogicPuzzle { id: "heyawake", label: "Heyawake", init: "initHeyawakeGrid", scripts: &["./logic/logicdiv/25_heyawake_ui.js", "./logic/js/25_heyawake.js"] },
    LogicPuzzle { id: "hitori", label: "Hitori", init: "initHitoriGrid", scripts: &["./logic/logicdiv/26_hitori_ui.js", "./logic/js/26_hitori.js"] },
    LogicPuzzle { id: "hotaru", label: "Hotaru Beam", init: "initHotaruGrid", scripts: &["./logic/logicdiv/27_hotaru_ui.js", "./logic/js/27_hotaru.js"] },
    LogicPuzzle { id: "kakuro", label: "Kakuro", init: "initKakuroGrid", scripts: &["./logic/logicdiv/28_kakuro_ui.js", "./logic/js/28_kakuro.js"] },
    LogicPuzzle { id: "kuromasu", label: "Kuromasu", init: "initKuromasuGrid", scripts: &["./logic/logicdiv/29_kuromasu_ui.js", "./logic/js/29_kuromasu.js"] },
    LogicPuzzle { id: "kurotto", label: "Kurotto", init: "initKurottoGrid", scripts: &["./logic/logicdiv/30_kurotto_ui.js", "./logic/js/30_kurotto.js"] },
    LogicPuzzle { id: "lits", label: "LITS", init: "initLITSGrid", scripts: &["./logic/logicdiv/31_lits_ui.js", "./logic/js/31_lits.js"] },
    LogicPuzzle { id: "magnets", label: "Magnets", init: "initMagnetsGrid", scripts: &["./logic/logicdiv/32_magnets_ui.js", "./logic/js/32_magnets.js"] },
    LogicPuzzle { id: "masyu", label: "Masyu", init: "initMasyuGrid", scripts: &["./logic/logicdiv/33_masyu_ui.js", "./logic/js/33_masyu.js"] },
    LogicPuzzle { id: "minesweeper", label: "Minesweeper", init: "initMSGrid", scripts: &[] },
    LogicPuzzle { id: "moonsun", label: "Moonsun", init: "initMSUGrid", scripts: &["./logic/logicdiv/35_moonsun_ui.js", "./logic/js/35_moonsun.js"] },
    LogicPuzzle { id: "nagare", label: "Nagare", init: "initNGGrid", scripts: &["./logic/logicdiv/36_nagare_ui.js", "./logic/js/36_nagare.js"] },
    LogicPuzzle { id: "nanro", label: "Nanro", init: "initNRGrid", scripts: &["./logic/logicdiv/37_nanro_ui.js", "./logic/js/37_nanro.js"] },
    LogicPuzzle { id: "ncells", label: "Ncells", init: "initNCGrid", scripts: &["./logic/logicdiv/38_ncells_ui.js", "./logic/js/38_ncells.js"] },
    LogicPuzzle { id: "nonogram", label: "Nonogram", init: "initNOGrid", scripts: &["./logic/logicdiv/39_nonogram_ui.js", "./logic/js/39_nonogram.js"] },
    LogicPuzzle { id: "norinori", label: "Norinori", init: "initNRIGrid", scripts: &["./logic/logicdiv/40_norinori_ui.js", "./logic/js/40_norinori.js"] },
    LogicPuzzle { id: "numberlink", label: "Numberlink", init: "initNLGrid", scripts: &["./logic/logicdiv/41_numberlink_ui.js", "./logic/js/41_numberlink.js"] },
    LogicPuzzle { id: "nuribou", label: "Nuribou", init: "initNuribouGrid", scripts: &["./logic/logicdiv/42_nuribou_ui.js", "./logic/js/42_nuribou.js"] },
    LogicPuzzle { id: "nurikabe", label: "Nurikabe", init: "initNurikabeGrid", scripts: &["./logic/logicdiv/43_nurikabe_ui.js", "./logic/js/43_nurikabe.js"] },
    LogicPuzzle { id: "nurimisaki", label: "Nurimisaki", init: "initNurimisakiGrid", scripts: &["./logic/logicdiv/44_nurimisaki_ui.js", "./logic/js/44_nurimisaki.js"] },
    LogicPuzzle { id: "onsen", label: "Onsen", init: "initOnsenGrid", scripts: &["./logic/logicdiv/45_onsen_ui.js", "./logic/js/45_onsen.js"] },
    LogicPuzzle { id: "rippleeffect", label: "Ripple Effect", init: "initRippleGrid", scripts: &[] },
    LogicPuzzle { id: "shakashaka", label: "Shakashaka", init: "initShakashakaGrid", scripts: &["./logic/logicdiv/47_shakashaka_ui.js", "./logic/js/47_shakashaka.js"] },
    LogicPuzzle { id: "shikaku", label: "Shikaku", init: "initShikakuGrid", scripts: &[] },
    LogicPuzzle { id: "shimaguni", label: "Shimaguni", init: "initShimaguniGrid", scripts: &["./logic/logicdiv/49_shimaguni_ui.js", "./logic/js/49_shimaguni.js"] },
    LogicPuzzle { id: "skyscrapers", label: "Skyscrapers", init: "initSkyscrapersGrid", scripts: &[] },
    LogicPuzzle { id: "slitherlink", label: "Slitherlink", init: "initSlitherlinkGrid", scripts: &["./logic/logicdiv/51_slitherlink_ui.js", "./logic/js/51_slitherlink.js"] },
    LogicPuzzle { id: "spiralgalaxies", label: "Spiral Galaxies", init: "initSGGrid", scripts: &["./logic/logicdiv/52_spiralgalaxies_ui.js", "./logic/js/52_spiralgalaxies.js"] },
    LogicPuzzle { id: "starbattle", label: "Starbattle", init: "initSBGrid", scripts: &[] },
    LogicPuzzle { id: "statuepark", label: "Statue Park", init: "initStatueparkGrid", scripts: &["./logic/logicdiv/54_statuepark_ui.js", "./logic/js/54_statuepark.js"] },
    LogicPuzzle { id: "stostone", label: "Stostone", init: "initStostoneGrid", scripts: &["./logic/logicdiv/55_stostone_ui.js", "./logic/js/55_stostone.js"] },
    LogicPuzzle { id: "tapa", label: "Tapa", init: "initTapaGrid", scripts: &["./logic/logicdiv/56_tapa_ui.js", "./logic/js/56_tapa.js"] },
    LogicPuzzle { id: "tatamibari", label: "Tatamibari", init: "initTatamibariGrid", scripts: &[] },
    LogicPuzzle { id: "tents", label: "Tents", init: "initTentsGrid", scripts: &[] },
    LogicPuzzle { id: "tll", label: "TLL", init: "initTllGrid", scripts: &["./logic/logicdiv/59_tll_ui.js", "./logic/js/59_tll.js"] },
    LogicPuzzle { id: "tren", label: "Tren", init: "initTrenGrid", scripts: &[] },
    LogicPuzzle { id: "yajilin", label: "Yajilin", init: "initYajilinGrid", scripts: &["./logic/logicdiv/61_yajilin_ui.js", "./logic/js/61_yajilin.js"] },
    LogicPuzzle { id: "yajisankazusan", label: "Yajisan-Kazusan", init: "initYKGrid", scripts: &[] },
    LogicPuzzle { id: "yinyang", label: "Yin Yang", init: "initYinyangGrid", scripts: &[] },
];

const SPACE_PUZZLES: &[SpacePuzzle] = &[
    SpacePuzzle { id: "standard-cube", label: "标准三维魔方", script: "./spacepuzzle/rubikscube/nubikscube.js" },
    SpacePuzzle { id: "skewbmofang", label: "Skewb 魔方", script: "./spacepuzzle/skewbmofang/skewbmofang.js" },
    SpacePuzzle { id: "jinzitamofang", label: "金字塔魔方", script: "./spacepuzzle/jinzitamofang/jinzitamofang.js" },
    SpacePuzzle { id: "rubiksclock", label: "Rubik's Clock", script: "./spacepuzzle/rubiksclock/rubiksclock.js" },
    SpacePuzzle { id: "squreonemofang", label: "Square-1 魔方", script: "./spacepuzzle/squreonemofang/squreonemofang.js" },
    SpacePuzzle { id: "number-huarong", label: "数字华容道", script: "./spacepuzzle/huarongdao/huarongdao.js" },
    SpacePuzzle { id: "qiqiaoban", label: "七巧板", script: "./spacepuzzle/qiqiaoban/qiqiaoban.js" },
    SpacePuzzle { id: "pentomino", label: "Pentomino 五连方", script: "./spacepuzzle/Pentomino/Pentomino.js" },
];

pub fn init() -> Result<(), JsValue> {
    init_wordsearch()?;
    install_logic_ui()?;
    init_logic_lab()?;
    install_space_puzzle_ui()?;
    init_space_lab()?;
    Ok(())
}

fn init_wordsearch() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("cihuiqu") else {
        return Ok(());
    };
    container.set_inner_html(WORDSEARCH_HTML);

    if let Some(button) = document.get_element_by_id("cihui-search-btn") {
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            start_wordsearch();
        }));
        button.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
    }

    if let Some(input) = document.get_element_by_id("patternInput") {
        let key = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
            if event.key() == "Enter" {
                event.prevent_default();
                start_wordsearch();
            }
        }));
        input.add_event_listener_with_callback("keydown", key.as_ref().unchecked_ref())?;
        key.forget();
    }

    if let Some(button) = document.get_element_by_id("prevPageBtn") {
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            wordsearch_prev_page();
        }));
        button.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
    }

    if let Some(button) = document.get_element_by_id("nextPageBtn") {
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            wordsearch_next_page();
        }));
        button.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
    }

    Ok(())
}

fn start_wordsearch() {
    let query = element_value("patternInput").trim().to_string();
    if query.is_empty() {
        show_wordsearch_toast("请输入搜索模式");
        return;
    }
    WORDSEARCH_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.query = query.clone();
        state.current_start.clear();
        state.history.clear();
        state.next_start = None;
    });
    spawn_wordsearch_fetch(query, String::new());
}

fn wordsearch_next_page() {
    let page = WORDSEARCH_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let next_start = state.next_start.clone()?;
        let current = state.current_start.clone();
        state.history.push(current);
        state.current_start = next_start.clone();
        state.next_start = None;
        Some((state.query.clone(), next_start))
    });
    if let Some((query, start)) = page {
        spawn_wordsearch_fetch(query, start);
    }
}

fn wordsearch_prev_page() {
    let page = WORDSEARCH_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let previous = state.history.pop()?;
        state.current_start = previous.clone();
        state.next_start = None;
        Some((state.query.clone(), previous))
    });
    if let Some((query, start)) = page {
        spawn_wordsearch_fetch(query, start);
    }
}

fn spawn_wordsearch_fetch(query: String, start: String) {
    set_wordsearch_loading(true);
    set_wordsearch_output_text("正在搜索...");
    update_wordsearch_pagination();

    spawn_local(async move {
        match fetch_wordsearch(&query, &start).await {
            Ok(result) => {
                WORDSEARCH_STATE.with(|state| {
                    state.borrow_mut().next_start = result.next_start.clone();
                });
                if let Err(err) = render_wordsearch_result(result) {
                    console::error_1(&err);
                }
            }
            Err(err) => {
                let message = err.as_string().unwrap_or_else(|| "搜索失败".to_string());
                set_wordsearch_output_text(&message);
                show_wordsearch_toast("搜索失败，请稍后重试");
            }
        }
        set_wordsearch_loading(false);
        update_wordsearch_pagination();
    });
}

async fn fetch_wordsearch(query: &str, start: &str) -> Result<WordSearchResult, JsValue> {
    let encoded_query = encode_component(query);
    let mut target = format!("https://nutrimatic.org/2024/?q={encoded_query}&go=Go");
    if !start.is_empty() {
        target.push_str("&start=");
        target.push_str(&encode_component(start));
    }

    let encoded_target = encode_component(&target);
    let proxies = [
        ("CodeTabs", format!("https://api.codetabs.com/v1/proxy?quest={encoded_target}"), false),
        ("AllOrigins", format!("https://api.allorigins.win/get?url={encoded_target}"), true),
        ("CorsProxy", format!("https://corsproxy.io/?{encoded_target}"), false),
    ];

    let mut last_error = String::new();
    for (name, url, json_payload) in proxies {
        match fetch_text(&url).await {
            Ok(raw) => {
                let html = if json_payload {
                    let parsed = js_sys::JSON::parse(&raw)?;
                    Reflect::get(&parsed, &JsValue::from_str("contents"))?
                        .as_string()
                        .unwrap_or_default()
                } else {
                    raw
                };
                if !html.trim().is_empty() {
                    return parse_wordsearch_html(&html);
                }
                last_error = format!("{name} 返回空内容");
            }
            Err(err) => {
                last_error = format!("{name}: {:?}", err);
            }
        }
    }

    Err(JsValue::from_str(&format!("所有代理请求失败。{last_error}")))
}

async fn fetch_text(url: &str) -> Result<String, JsValue> {
    let response = JsFuture::from(window()?.fetch_with_str(url)).await?;
    let response: Response = response.dyn_into()?;
    let text = JsFuture::from(response.text()?).await?;
    Ok(text.as_string().unwrap_or_default())
}

fn parse_wordsearch_html(html: &str) -> Result<WordSearchResult, JsValue> {
    let parser = DomParser::new()?;
    let parsed = parser.parse_from_string(html, SupportedType::TextHtml)?;

    let mut next_start = None;
    let links = parsed.query_selector_all("a")?;
    for index in 0..links.length() {
        let Some(node) = links.item(index) else {
            continue;
        };
        let link: Element = node.unchecked_into();
        let href = link.get_attribute("href").unwrap_or_default();
        let text = link.text_content().unwrap_or_default().to_lowercase();
        if (text.contains("next") || href.contains("start=")) && href.contains("start=") {
            next_start = extract_start_param(&href);
            if text.contains("next") {
                break;
            }
        }
    }

    for selector in ["script", "style", "form", "center", "h1", "a"] {
        let nodes = parsed.query_selector_all(selector)?;
        for index in 0..nodes.length() {
            if let Some(node) = nodes.item(index) {
                node.unchecked_into::<Element>().remove();
            }
        }
    }

    let raw_text = parsed
        .body()
        .and_then(|body| body.text_content())
        .unwrap_or_default();
    let lines = raw_text
        .lines()
        .map(str::trim)
        .filter(|line| {
            !line.is_empty()
                && !line.contains("Nutrimatic")
                && !line.contains("Search Results")
                && !line.contains("found")
                && !line.contains("elapsed")
                && !line.contains("Search")
                && !line.contains("pattern")
        })
        .map(ToString::to_string)
        .collect();

    Ok(WordSearchResult { lines, next_start })
}

fn render_wordsearch_result(result: WordSearchResult) -> Result<(), JsValue> {
    let document = document()?;
    let Some(output) = document.get_element_by_id("resultOutput") else {
        return Ok(());
    };
    output.set_inner_html("");

    if result.lines.is_empty() {
        output.set_text_content(Some("未找到匹配结果。"));
        return Ok(());
    }

    for line in result.lines {
        let word = document.create_element("span")?;
        word.set_class_name("cihuiword-item");
        word.set_attribute("title", "点击复制")?;
        word.set_text_content(Some(&line));
        let text = line.clone();
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            copy_wordsearch_text(&text);
        }));
        word.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
        let node: Node = word.into();
        let _ = output.append_child(&node);
    }

    Ok(())
}

fn set_wordsearch_loading(active: bool) {
    if let Ok(document) = document() {
        if let Some(loader) = document.get_element_by_id("loader") {
            set_display(&loader, if active { "block" } else { "none" });
        }
    }
}

fn set_wordsearch_output_text(text: &str) {
    if let Ok(document) = document() {
        if let Some(output) = document.get_element_by_id("resultOutput") {
            output.set_text_content(Some(text));
        }
    }
}

fn update_wordsearch_pagination() {
    let Ok(document) = document() else {
        return;
    };
    let (has_prev, has_next) = WORDSEARCH_STATE.with(|state| {
        let state = state.borrow();
        (!state.history.is_empty(), state.next_start.is_some())
    });

    if let Some(pagination) = document.get_element_by_id("paginationControls") {
        set_display(&pagination, if has_prev || has_next { "flex" } else { "none" });
    }
    update_page_button("prevPageBtn", !has_prev);
    update_page_button("nextPageBtn", !has_next);
}

fn update_page_button(id: &str, disabled: bool) {
    if let Ok(document) = document() {
        if let Some(button) = document.get_element_by_id(id) {
            let _ = button.class_list().toggle_with_force("disabled", disabled);
            let _ = button.set_attribute("aria-disabled", if disabled { "true" } else { "false" });
        }
    }
}

fn copy_wordsearch_text(text: &str) {
    if copy_to_clipboard(text).is_ok() {
        show_wordsearch_toast("已复制");
    } else {
        show_wordsearch_toast("复制失败");
    }
}

fn copy_to_clipboard(text: &str) -> Result<(), JsValue> {
    let document = document()?;
    let body = document
        .body()
        .ok_or_else(|| JsValue::from_str("document.body is missing"))?;
    let textarea: HtmlTextAreaElement = document.create_element("textarea")?.unchecked_into();
    textarea.set_value(text);
    textarea.set_attribute("readonly", "readonly")?;
    let style = textarea.unchecked_ref::<HtmlElement>().style();
    style.set_property("position", "fixed")?;
    style.set_property("left", "-9999px")?;
    style.set_property("top", "0")?;
    let node: Node = textarea.clone().into();
    body.append_child(&node)?;
    textarea.select();

    let exec = Reflect::get(document.as_ref(), &JsValue::from_str("execCommand"))?
        .dyn_into::<Function>()?;
    let _ = exec.call1(document.as_ref(), &JsValue::from_str("copy"))?;
    textarea.remove();
    Ok(())
}

fn show_wordsearch_toast(text: &str) {
    let Ok(doc) = document() else {
        return;
    };
    let Some(toast) = doc.get_element_by_id("cihuitoast") else {
        return;
    };
    toast.set_text_content(Some(text));
    let _ = toast.class_list().add_1("show");
    timeout(1800, move || {
        if let Ok(document) = document() {
            if let Some(toast) = document.get_element_by_id("cihuitoast") {
                let _ = toast.class_list().remove_1("show");
            }
        }
    });
}

fn init_logic_lab() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("luojimiti") else {
        return Ok(());
    };
    container.set_inner_html(
        r#"<div class="container" id="logic-list-container"></div>
<div id="logic-workspace-container" style="display:none;padding-top:4rem;margin-top:2rem;"></div>"#,
    );
    render_logic_buttons()?;
    install_logic_globals()?;
    Ok(())
}

fn render_logic_buttons() -> Result<(), JsValue> {
    let document = document()?;
    let Some(list) = document.get_element_by_id("logic-list-container") else {
        return Ok(());
    };
    list.set_inner_html("");
    for puzzle in LOGIC_PUZZLES {
        let button = document.create_element("button")?;
        button.set_class_name("logic-btn");
        button.set_attribute("type", "button")?;
        button.set_attribute("data-target", puzzle.id)?;
        button.set_text_content(Some(puzzle.label));
        let target = puzzle.id.to_string();
        let button_for_state = button.clone();
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            if button_for_state.get_attribute("aria-busy").as_deref() == Some("true") {
                return;
            }
            let _ = button_for_state.set_attribute("aria-busy", "true");
            let button_done = button_for_state.clone();
            let target = target.clone();
            spawn_local(async move {
                if let Err(err) = open_logic_puzzle(&target).await {
                    console::error_1(&err);
                }
                let _ = button_done.remove_attribute("aria-busy");
            });
        }));
        button.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
        let node: Node = button.into();
        list.append_child(&node)?;
    }
    Ok(())
}

fn install_logic_globals() -> Result<(), JsValue> {
    let open = Closure::<dyn FnMut(JsValue) -> JsValue>::wrap(Box::new(move |target: JsValue| {
        let id = target.as_string().unwrap_or_default();
        promise_from(async move { open_logic_puzzle(&id).await })
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("openLogicPuzzle"), open.as_ref())?;
    open.forget();

    let loader = Object::new();
    Reflect::set(
        loader.as_ref(),
        &JsValue::from_str("loadPuzzle"),
        window_prop("openLogicPuzzle").as_ref().unwrap_or(&JsValue::NULL),
    )?;
    Reflect::set(window()?.as_ref(), &JsValue::from_str("logicPuzzleLoader"), loader.as_ref())?;
    Ok(())
}

async fn open_logic_puzzle(target: &str) -> Result<(), JsValue> {
    let Some(puzzle) = LOGIC_PUZZLES.iter().find(|puzzle| puzzle.id == target) else {
        return Ok(());
    };

    if puzzle.id == "sudoku" {
        append_sudoku_workspace()?;
        show_logic_workspace("sudoku")?;
        init_sudoku_grid()?;
        return Ok(());
    }
    if puzzle.id == "akari" {
        append_akari_workspace()?;
        show_logic_workspace("akari")?;
        init_akari_grid()?;
        return Ok(());
    }
    if puzzle.id == "yinyang" {
        append_yinyang_workspace()?;
        show_logic_workspace("yinyang")?;
        init_yinyang_grid()?;
        return Ok(());
    }
    if puzzle.id == "starbattle" {
        append_starbattle_workspace()?;
        show_logic_workspace("starbattle")?;
        init_starbattle_grid()?;
        return Ok(());
    }
    if puzzle.id == "shikaku" {
        append_shikaku_workspace()?;
        show_logic_workspace("shikaku")?;
        init_shikaku_grid()?;
        return Ok(());
    }
    if puzzle.id == "rippleeffect" {
        append_ripple_workspace()?;
        show_logic_workspace("rippleeffect")?;
        init_ripple_grid()?;
        return Ok(());
    }
    if puzzle.id == "tents" {
        append_tents_workspace()?;
        show_logic_workspace("tents")?;
        init_tents_grid()?;
        return Ok(());
    }
    if puzzle.id == "skyscrapers" {
        append_skyscrapers_workspace()?;
        show_logic_workspace("skyscrapers")?;
        init_skyscrapers_grid()?;
        return Ok(());
    }
    if puzzle.id == "tren" {
        append_tren_workspace()?;
        show_logic_workspace("tren")?;
        init_tren_grid()?;
        return Ok(());
    }
    if puzzle.id == "minesweeper" {
        append_minesweeper_workspace()?;
        show_logic_workspace("minesweeper")?;
        init_minesweeper_grid()?;
        return Ok(());
    }
    if puzzle.id == "binairo" {
        append_binairo_workspace()?;
        show_logic_workspace("binairo")?;
        init_binairo_grid()?;
        return Ok(());
    }
    if puzzle.id == "tatamibari" {
        append_tatamibari_workspace()?;
        show_logic_workspace("tatamibari")?;
        init_tatamibari_grid()?;
        return Ok(());
    }
    if puzzle.id == "yajisankazusan" {
        append_yajisan_workspace()?;
        show_logic_workspace("yajisankazusan")?;
        init_yajisan_grid()?;
        return Ok(());
    }

    let already_loaded = LOGIC_LOADED.with(|loaded| loaded.borrow().contains(puzzle.id));
    if !already_loaded {
        for script in puzzle.scripts {
            load_script_once(script, true).await?;
        }
        LOGIC_LOADED.with(|loaded| {
            loaded.borrow_mut().insert(puzzle.id);
        });
    }

    append_logic_workspace(puzzle.id)?;
    show_logic_workspace(puzzle.id)?;
    call_global0(puzzle.init);
    Ok(())
}

fn append_sudoku_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("sudoku-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let diagonal_button = r#"<div style="margin-bottom:1.5rem;padding:1rem;background:rgba(0,0,0,0.4);border-left:3px solid var(--neon-purple);border-radius:4px;">
        <h3 style="color:var(--neon-purple);margin-bottom:10px;font-size:1rem;">高级规则</h3>
        <button id="sudoku-diagonal-btn" class="cyber-button" style="width:100%;justify-content:center;border-color:rgba(255,255,255,0.2);" onclick="window.toggleSudokuDiagonal && window.toggleSudokuDiagonal()"><span class="cyber-button__tag">对角线约束 <span class="status" style="margin-left:10px;color:#888;font-weight:bold;">OFF</span></span></button>
    </div>"#;
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("sudoku-workspace"),
        logic_title("数独 求解器", &object_with_pairs(&[("color", "var(--neon-blue)")])) ,
        logic_action_grid4(&sudoku_action_buttons()),
        diagonal_button,
        logic_stats_panel("sudoku", &object_with_pairs(&[
            ("countLabel", "找到解决方案"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "var(--neon-blue)")
        ])),
        "<div id=\"sudoku-result\" style=\"margin-top:1rem;color:var(--neon-green);text-align:center;font-size:1.1rem;min-height:1.5rem;\"></div>",
        format!(
            "{}{}",
            logic_solution_nav("sudoku", "showSudokuSolution", &object_with_pairs(&[("accent", "var(--neon-blue)")])),
            logic_instructions(
                &array_from_strings(&[
                    "点击格子后输入 1-9，Backspace/Delete 清空当前格",
                    "对角线约束开启时，两条主对角线也必须 1-9 不重复",
                    "简单示例会填入一个可快速验证的标准数独"
                ]),
                &object_with_pairs(&[("accent", "var(--neon-blue)"), ("title", "操作说明")])
            )
        )
    );
    let html = logic_workspace(
        "sudoku-workspace",
        "sudoku-layout",
        &left,
        "<div class=\"logic-sudoku-grid\" id=\"logic-sudoku-grid\"></div>",
        Some(
            ".logic-sudoku-grid{width:100%;max-width:550px;display:grid;grid-template-columns:repeat(9,1fr);gap:1px;background:var(--neon-blue);padding:2px;border:2px solid var(--neon-blue);box-shadow:0 0 20px rgba(0,255,255,0.2);position:relative}
            .sudoku-cell{width:100%;height:auto;aspect-ratio:1;background:rgba(10,10,15,0.95);border:none;text-align:center;font-size:2.2rem;font-family:'Courier New',Courier,monospace;color:white;cursor:text;outline:none;transition:all .2s ease;padding:0;margin:0}
            .sudoku-cell:focus{background:rgba(0,255,255,0.15);box-shadow:inset 0 0 10px rgba(0,255,255,0.3)}
            .sudoku-cell.fixed{color:var(--neon-purple);font-weight:bold;background:rgba(255,0,255,0.08);text-shadow:0 0 8px rgba(255,0,255,0.5)}
            .sudoku-cell.solution{color:var(--neon-green);text-shadow:0 0 8px rgba(46,255,150,.45)}
            .sudoku-cell.conflict{background:rgba(255,30,80,.16);box-shadow:inset 0 0 12px rgba(255,30,80,.35)}
            .sudoku-cell.diagonal{box-shadow:inset 0 0 0 999px rgba(0,255,255,.035)}
            .sudoku-cell:nth-child(3n){border-right:2px solid var(--neon-blue)}
            .sudoku-cell:nth-child(9n){border-right:none}
            .sudoku-cell:nth-child(n+19):nth-child(-n+27),.sudoku-cell:nth-child(n+46):nth-child(-n+54){border-bottom:2px solid var(--neon-blue)}
            #sudoku-diagonal-btn.active{box-shadow:0 0 15px rgba(0,255,255,0.4);background:rgba(0,255,255,0.1)}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_sudoku_globals()?;
    Ok(())
}

fn install_sudoku_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_sudoku_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initSudokuGrid"), init.as_ref())?;
    init.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_sudoku_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveSudokuPuzzle"), solve.as_ref())?;
    solve.forget();

    let undo = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = undo_sudoku_last_step() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("undoSudokuLastStep"), undo.as_ref())?;
    undo.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_sudoku_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleSudokuExample"),
        example.as_ref(),
    )?;
    example.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_sudoku_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showSudokuSolution"), show.as_ref())?;
    show.forget();

    let toggle = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = toggle_sudoku_diagonal() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("toggleSudokuDiagonal"),
        toggle.as_ref(),
    )?;
    toggle.forget();
    Ok(())
}

fn init_sudoku_grid() -> Result<(), JsValue> {
    SUDOKU_STATE.with(|state| {
        let diagonal = state.borrow().diagonal;
        *state.borrow_mut() = SudokuState {
            diagonal,
            ..SudokuState::new()
        };
    });
    SUDOKU_HISTORY.with(|history| history.borrow_mut().clear());
    set_sudoku_stats("0", "0");
    set_sudoku_result("");
    set_sudoku_nav(false);
    update_sudoku_diagonal_button();
    render_sudoku_grid()
}

fn save_sudoku_history() {
    let values = SUDOKU_STATE.with(|state| state.borrow().values.clone());
    SUDOKU_HISTORY.with(|history| {
        let mut history = history.borrow_mut();
        history.push(values);
        if history.len() > 50 {
            history.remove(0);
        }
    });
}

fn undo_sudoku_last_step() -> Result<(), JsValue> {
    let previous = SUDOKU_HISTORY.with(|history| history.borrow_mut().pop());
    if let Some(values) = previous {
        SUDOKU_STATE.with(|state| {
            let mut state = state.borrow_mut();
            state.values = values;
            state.fixed = state.values.iter().map(Option::is_some).collect();
            state.solutions.clear();
            state.solution_index = 0;
            state.showing_solution = false;
        });
        set_sudoku_stats("0", "0");
        set_sudoku_result("");
        set_sudoku_nav(false);
        render_sudoku_grid()
    } else {
        init_sudoku_grid()
    }
}

fn build_simple_sudoku_example() -> Result<(), JsValue> {
    save_sudoku_history();
    let puzzle = [
        "530070000",
        "600195000",
        "098000060",
        "800060003",
        "400803001",
        "700020006",
        "060000280",
        "000419005",
        "000080079",
    ];
    let mut values = vec![None; 81];
    for (row, line) in puzzle.iter().enumerate() {
        for (col, ch) in line.chars().enumerate() {
            if let Some(value) = ch.to_digit(10).filter(|value| *value > 0) {
                values[row * 9 + col] = Some(value as u8);
            }
        }
    }
    SUDOKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.values = values;
        state.fixed = state.values.iter().map(Option::is_some).collect();
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_sudoku_stats("0", "0");
    set_sudoku_result("");
    set_sudoku_nav(false);
    render_sudoku_grid()
}

fn toggle_sudoku_diagonal() -> Result<(), JsValue> {
    SUDOKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.diagonal = !state.diagonal;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_sudoku_stats("0", "0");
    set_sudoku_result("");
    set_sudoku_nav(false);
    update_sudoku_diagonal_button();
    render_sudoku_grid()
}

fn render_sudoku_grid() -> Result<(), JsValue> {
    let doc = document()?;
    let Some(container) = doc.get_element_by_id("logic-sudoku-grid") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = SUDOKU_STATE.with(|state| state.borrow().clone());
    let conflict_cells = sudoku_conflict_cells(&state.values, state.diagonal);
    let solution = if state.showing_solution {
        state.solutions.get(state.solution_index).cloned()
    } else {
        None
    };

    for index in 0..81 {
        let input: HtmlInputElement = doc.create_element("input")?.unchecked_into();
        input.set_attribute("type", "text")?;
        input.set_attribute("maxlength", "1")?;
        input.set_class_name("sudoku-cell");
        input.set_attribute("data-index", &index.to_string())?;
        let row = index / 9;
        let col = index % 9;
        if state.diagonal && (row == col || row + col == 8) {
            input.class_list().add_1("diagonal")?;
        }
        let display_value = solution
            .as_ref()
            .and_then(|solution| solution.get(index).copied())
            .or(state.values[index]);
        if let Some(value) = display_value {
            input.set_value(&value.to_string());
        }
        if state.fixed[index] {
            input.class_list().add_1("fixed")?;
        } else if solution.is_some() && display_value.is_some() {
            input.class_list().add_1("solution")?;
        }
        if conflict_cells.contains(&index) {
            input.class_list().add_1("conflict")?;
        }

        let input_closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            let Some(target) = event.target().and_then(|target| target.dyn_into::<HtmlInputElement>().ok()) else {
                return;
            };
            let raw = target.value();
            let value = raw
                .chars()
                .find(|ch| ('1'..='9').contains(ch))
                .and_then(|ch| ch.to_digit(10))
                .map(|value| value as u8);
            save_sudoku_history();
            SUDOKU_STATE.with(|state| {
                let mut state = state.borrow_mut();
                state.values[index] = value;
                state.fixed[index] = value.is_some();
                state.solutions.clear();
                state.solution_index = 0;
                state.showing_solution = false;
            });
            set_sudoku_stats("0", "0");
            set_sudoku_result("");
            set_sudoku_nav(false);
            if let Err(err) = render_sudoku_grid() {
                console::error_1(&err);
            }
            if let Ok(document) = document() {
                if let Some(next) = document
                    .query_selector(&format!(".sudoku-cell[data-index=\"{index}\"]"))
                    .ok()
                    .flatten()
                    .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
                {
                    let _ = next.focus();
                }
            }
        }));
        input.add_event_listener_with_callback("input", input_closure.as_ref().unchecked_ref())?;
        input_closure.forget();

        let key_closure = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
            let key = event.key();
            if key == "Backspace" || key == "Delete" || key == "0" {
                event.prevent_default();
                save_sudoku_history();
                SUDOKU_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    state.values[index] = None;
                    state.fixed[index] = false;
                    state.solutions.clear();
                    state.solution_index = 0;
                    state.showing_solution = false;
                });
                set_sudoku_stats("0", "0");
                set_sudoku_result("");
                set_sudoku_nav(false);
                if let Err(err) = render_sudoku_grid() {
                    console::error_1(&err);
                }
            }
        }));
        input.add_event_listener_with_callback("keydown", key_closure.as_ref().unchecked_ref())?;
        key_closure.forget();

        container.append_child(&input)?;
    }
    Ok(())
}

fn solve_sudoku_puzzle_ui() -> Result<(), JsValue> {
    let snapshot = SUDOKU_STATE.with(|state| state.borrow().clone());
    let started = js_sys::Date::now();
    let result = solve_sudoku(&snapshot.values, snapshot.diagonal);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.conflict {
        "输入冲突".to_string()
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    SUDOKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_sudoku_stats(&count_text, &elapsed);
    set_sudoku_nav(has_solution);
    if result.conflict {
        set_sudoku_result("输入存在行、列、宫或对角线冲突");
    } else if has_solution {
        set_sudoku_result("");
        show_sudoku_solution(0)?;
    } else {
        set_sudoku_result("无解，请检查输入约束");
        render_sudoku_grid()?;
    }
    Ok(())
}

fn show_sudoku_solution(delta: isize) -> Result<(), JsValue> {
    SUDOKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = SUDOKU_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("sudoku-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_sudoku_grid()
}

struct SudokuSolveResult {
    solutions: Vec<Vec<u8>>,
    timed_out: bool,
    conflict: bool,
}

fn solve_sudoku(values: &[Option<u8>], diagonal: bool) -> SudokuSolveResult {
    const MAX_SOLUTIONS: usize = 50;
    const TIME_LIMIT_MS: f64 = 2_500.0;

    if !sudoku_initial_valid(values, diagonal) {
        return SudokuSolveResult {
            solutions: Vec::new(),
            timed_out: false,
            conflict: true,
        };
    }
    let mut grid: Vec<u8> = values.iter().map(|value| value.unwrap_or(0)).collect();
    let mut result = SudokuSolveResult {
        solutions: Vec::new(),
        timed_out: false,
        conflict: false,
    };
    let started = js_sys::Date::now();
    sudoku_backtrack(&mut grid, diagonal, started, TIME_LIMIT_MS, MAX_SOLUTIONS, &mut result);
    result
}

fn sudoku_backtrack(
    grid: &mut [u8],
    diagonal: bool,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut SudokuSolveResult,
) -> bool {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return true;
    }
    if js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return true;
    }
    let Some(index) = sudoku_best_empty_cell(grid, diagonal) else {
        result.solutions.push(grid.to_vec());
        return result.solutions.len() >= max_solutions;
    };
    let candidates = sudoku_candidates(grid, index, diagonal);
    if candidates.is_empty() {
        return false;
    }
    for value in candidates {
        grid[index] = value;
        if sudoku_backtrack(grid, diagonal, started, time_limit_ms, max_solutions, result) {
            grid[index] = 0;
            return true;
        }
        grid[index] = 0;
    }
    false
}

fn sudoku_best_empty_cell(grid: &[u8], diagonal: bool) -> Option<usize> {
    let mut best: Option<(usize, usize)> = None;
    for index in 0..81 {
        if grid[index] != 0 {
            continue;
        }
        let count = sudoku_candidates(grid, index, diagonal).len();
        if count == 0 {
            return Some(index);
        }
        if best.map(|(_, best_count)| count < best_count).unwrap_or(true) {
            best = Some((index, count));
        }
    }
    best.map(|(index, _)| index)
}

fn sudoku_candidates(grid: &[u8], index: usize, diagonal: bool) -> Vec<u8> {
    (1..=9)
        .filter(|value| sudoku_can_place(grid, index, *value, diagonal))
        .collect()
}

fn sudoku_can_place(grid: &[u8], index: usize, value: u8, diagonal: bool) -> bool {
    let row = index / 9;
    let col = index % 9;
    for c in 0..9 {
        let other = row * 9 + c;
        if other != index && grid[other] == value {
            return false;
        }
    }
    for r in 0..9 {
        let other = r * 9 + col;
        if other != index && grid[other] == value {
            return false;
        }
    }
    let box_row = row / 3 * 3;
    let box_col = col / 3 * 3;
    for r in box_row..box_row + 3 {
        for c in box_col..box_col + 3 {
            let other = r * 9 + c;
            if other != index && grid[other] == value {
                return false;
            }
        }
    }
    if diagonal && row == col {
        for i in 0..9 {
            let other = i * 9 + i;
            if other != index && grid[other] == value {
                return false;
            }
        }
    }
    if diagonal && row + col == 8 {
        for i in 0..9 {
            let other = i * 9 + (8 - i);
            if other != index && grid[other] == value {
                return false;
            }
        }
    }
    true
}

fn sudoku_initial_valid(values: &[Option<u8>], diagonal: bool) -> bool {
    let grid: Vec<u8> = values.iter().map(|value| value.unwrap_or(0)).collect();
    for index in 0..81 {
        let value = grid[index];
        if value != 0 && !sudoku_can_place(&grid, index, value, diagonal) {
            return false;
        }
    }
    true
}

fn sudoku_conflict_cells(values: &[Option<u8>], diagonal: bool) -> HashSet<usize> {
    let grid: Vec<u8> = values.iter().map(|value| value.unwrap_or(0)).collect();
    let mut conflicts = HashSet::new();
    for index in 0..81 {
        let value = grid[index];
        if value != 0 && !sudoku_can_place(&grid, index, value, diagonal) {
            conflicts.insert(index);
        }
    }
    conflicts
}

fn set_sudoku_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("sudoku-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("sudoku-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_sudoku_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("sudoku-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn set_sudoku_result(text: &str) {
    if let Ok(document) = document() {
        if let Some(result) = document.get_element_by_id("sudoku-result") {
            result.set_text_content(Some(text));
        }
    }
}

fn update_sudoku_diagonal_button() {
    let diagonal = SUDOKU_STATE.with(|state| state.borrow().diagonal);
    if let Ok(document) = document() {
        if let Some(button) = document.get_element_by_id("sudoku-diagonal-btn") {
            let _ = button.class_list().toggle_with_force("active", diagonal);
            let _ = button.set_attribute("aria-pressed", if diagonal { "true" } else { "false" });
            if let Some(status) = button.query_selector(".status").ok().flatten() {
                status.set_text_content(Some(if diagonal { "ON" } else { "OFF" }));
                let _ = status
                    .unchecked_ref::<HtmlElement>()
                    .style()
                    .set_property("color", if diagonal { "var(--neon-blue)" } else { "#888" });
            }
            let _ = button
                .unchecked_ref::<HtmlElement>()
                .style()
                .set_property("border-color", if diagonal { "var(--neon-blue)" } else { "rgba(255,255,255,0.2)" });
        }
    }
}

fn sudoku_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initSudokuGrid && window.initSudokuGrid()", "", false),
        (
            "计算核心分析",
            "window.solveSudokuPuzzle && window.solveSudokuPuzzle()",
            "sudoku-solve-btn",
            true,
        ),
        (
            "清空填涂 / 返回上步",
            "window.undoSudokuLastStep && window.undoSudokuLastStep()",
            "",
            false,
        ),
        (
            "简单示例",
            "window.buildSimpleSudokuExample && window.buildSimpleSudokuExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_yinyang_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("yinyang-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("yinyang-workspace"),
        logic_title("YIN YANG", &object_with_pairs(&[("color", "var(--neon-cyan)")])),
        logic_single_size_input(
            "yy-size",
            &object_with_pairs(&[("val", "6"), ("min", "4"), ("max", "10"), ("placeholder", "N×N")])
        ),
        logic_action_grid4(&yinyang_action_buttons()),
        logic_stats_panel("yy", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("yy", "showYinyangSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])),
        logic_instructions(
            &array_from_strings(&["点击格子切换: 空→阳→阴→空", "阳/阴各自必须四连通", "不得出现2×2同色方块"]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "yinyang-workspace",
        "yinyang-layout",
        &left,
        "<div id=\"yy-grid-container\"></div>",
        Some(
            "#yy-grid-container{display:inline-grid;padding:10px;background:rgba(0,0,0,.55);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none;gap:3px}
        .yy-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);border-radius:5px;cursor:pointer;position:relative;transition:all .2s}
        .yy-cell:hover{box-shadow:0 0 8px rgba(0,255,231,.25);border-color:rgba(0,255,231,.3)}
        .yy-cell.yy-w{background:rgba(255,180,50,.55);border-color:rgba(255,180,50,.4)}
        .yy-cell.yy-b{background:rgba(40,190,170,.55);border-color:rgba(40,190,170,.4)}
        .yy-cell.yy-clue::after{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.7)}
        .yy-cell.yy-sol.yy-w{background:rgba(240,120,180,.5);border-color:rgba(240,120,180,.35)}
        .yy-cell.yy-sol.yy-b{background:rgba(100,130,230,.5);border-color:rgba(100,130,230,.35)}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_yinyang_globals()?;
    Ok(())
}

fn install_yinyang_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_yinyang_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initYinyangGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_yinyang_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearYinyangGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_yinyang_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleYinyangExample"),
        example.as_ref(),
    )?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_yinyang_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("solveYinyangPuzzleUI"),
        solve.as_ref(),
    )?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        let delta = delta.as_f64().unwrap_or(0.0) as isize;
        if let Err(err) = show_yinyang_solution(delta) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showYinyangSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn init_yinyang_grid() -> Result<(), JsValue> {
    let size = read_yinyang_size();
    YINYANG_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.size = size;
        state.grid = empty_yinyang_grid(size);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_yinyang_stats("-", "-");
    set_yinyang_nav(false);
    render_yinyang_grid()
}

fn clear_yinyang_grid() -> Result<(), JsValue> {
    let size = YINYANG_STATE.with(|state| state.borrow().size);
    YINYANG_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.grid = empty_yinyang_grid(size);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_yinyang_stats("-", "-");
    set_yinyang_nav(false);
    render_yinyang_grid()
}

fn build_simple_yinyang_example() -> Result<(), JsValue> {
    if let Some(input) = document()?.get_element_by_id("yy-size") {
        if let Some(input) = input.dyn_ref::<HtmlInputElement>() {
            input.set_value("4");
        }
    }
    let mut grid = empty_yinyang_grid(4);
    grid[0][0] = 1;
    grid[0][3] = 1;
    grid[1][1] = 2;
    grid[1][3] = 2;
    grid[3][0] = 1;
    grid[3][3] = 2;
    YINYANG_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.size = 4;
        state.grid = grid;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_yinyang_stats("-", "-");
    set_yinyang_nav(false);
    render_yinyang_grid()
}

fn solve_yinyang_puzzle_ui() -> Result<(), JsValue> {
    let size = read_yinyang_size();
    let grid = YINYANG_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.size = size;
        state.grid.resize(size, Vec::new());
        for row in &mut state.grid {
            row.resize(size, 0);
        }
        state.grid.clone()
    });
    let started = js_sys::Date::now();
    let result = solve_yinyang(size, &grid);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    YINYANG_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_yinyang_stats(&count_text, &elapsed);
    set_yinyang_nav(has_solution);
    if has_solution {
        show_yinyang_solution(0)
    } else {
        render_yinyang_grid()
    }
}

fn show_yinyang_solution(delta: isize) -> Result<(), JsValue> {
    YINYANG_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = YINYANG_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("yy-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_yinyang_grid()
}

fn render_yinyang_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("yy-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let (size, grid, solution, showing) = YINYANG_STATE.with(|state| {
        let state = state.borrow();
        let solution = state.solutions.get(state.solution_index).cloned();
        (state.size, state.grid.clone(), solution, state.showing_solution)
    });
    container
        .unchecked_ref::<HtmlElement>()
        .style()
        .set_property("grid-template-columns", &format!("repeat({size},42px)"))?;

    for row in 0..size {
        for col in 0..size {
            let cell = document.create_element("div")?;
            cell.set_class_name("yy-cell");
            cell.set_attribute("data-r", &row.to_string())?;
            cell.set_attribute("data-c", &col.to_string())?;
            let clue_value = grid[row][col];
            let display_value = if showing {
                solution
                    .as_ref()
                    .and_then(|solution| solution.get(row).and_then(|row| row.get(col)).copied())
                    .unwrap_or(clue_value)
            } else {
                clue_value
            };
            apply_yinyang_cell_classes(&cell, display_value, clue_value, showing)?;
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let showing = YINYANG_STATE.with(|state| state.borrow().showing_solution);
                if showing {
                    return;
                }
                YINYANG_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    state.grid[row][col] = (state.grid[row][col] + 1) % 3;
                });
                if let Err(err) = render_yinyang_grid() {
                    console::error_1(&err);
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            let node: Node = cell.into();
            container.append_child(&node)?;
        }
    }
    Ok(())
}

fn apply_yinyang_cell_classes(
    cell: &Element,
    display_value: u8,
    clue_value: u8,
    showing_solution: bool,
) -> Result<(), JsValue> {
    if display_value == 1 {
        cell.class_list().add_1("yy-w")?;
    } else if display_value == 2 {
        cell.class_list().add_1("yy-b")?;
    }
    if clue_value != 0 {
        cell.class_list().add_1("yy-clue")?;
    } else if showing_solution {
        cell.class_list().add_1("yy-sol")?;
    }
    Ok(())
}

fn read_yinyang_size() -> usize {
    let value = document()
        .ok()
        .and_then(|document| document.get_element_by_id("yy-size"))
        .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
        .and_then(|input| input.value().parse::<usize>().ok())
        .unwrap_or(6)
        .clamp(4, 10);
    if let Ok(document) = document() {
        if let Some(input) = document
            .get_element_by_id("yy-size")
            .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
        {
            input.set_value(&value.to_string());
        }
    }
    value
}

fn empty_yinyang_grid(size: usize) -> Vec<Vec<u8>> {
    vec![vec![0; size]; size]
}

fn set_yinyang_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("yy-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("yy-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_yinyang_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("yy-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

struct YinYangSolveResult {
    solutions: Vec<Vec<Vec<u8>>>,
    timed_out: bool,
}

fn solve_yinyang(size: usize, grid: &[Vec<u8>]) -> YinYangSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const STEP_LIMIT: usize = 2_500_000;

    let total = size * size;
    let mut board = vec![0u8; total];
    let mut fixed = vec![false; total];
    let mut order = Vec::new();
    for row in 0..size {
        for col in 0..size {
            let index = row * size + col;
            let value = grid.get(row).and_then(|row| row.get(col)).copied().unwrap_or(0);
            board[index] = value;
            if value != 0 {
                fixed[index] = true;
            }
        }
    }
    for index in 0..total {
        if !fixed[index] {
            order.push(index);
        }
    }

    let mut result = YinYangSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    yinyang_dfs(
        0,
        size,
        &order,
        &mut board,
        &mut result,
        &mut steps,
        MAX_SOLUTIONS,
        STEP_LIMIT,
    );
    result
}

fn yinyang_dfs(
    depth: usize,
    size: usize,
    order: &[usize],
    board: &mut [u8],
    result: &mut YinYangSolveResult,
    steps: &mut usize,
    max_solutions: usize,
    step_limit: usize,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if *steps > step_limit {
        result.timed_out = true;
        return;
    }
    if depth >= order.len() {
        if yinyang_connected(size, board, 1) && yinyang_connected(size, board, 2) {
            let mut solution = empty_yinyang_grid(size);
            for row in 0..size {
                for col in 0..size {
                    solution[row][col] = board[row * size + col];
                }
            }
            result.solutions.push(solution);
        }
        return;
    }
    let position = order[depth];
    for value in [1u8, 2u8] {
        board[position] = value;
        if yinyang_no_2x2(size, board, position, value) {
            yinyang_dfs(
                depth + 1,
                size,
                order,
                board,
                result,
                steps,
                max_solutions,
                step_limit,
            );
            if result.timed_out || result.solutions.len() >= max_solutions {
                board[position] = 0;
                return;
            }
        }
    }
    board[position] = 0;
}

fn yinyang_no_2x2(size: usize, board: &[u8], position: usize, value: u8) -> bool {
    let row = position / size;
    let col = position % size;
    let starts = [
        (row.checked_sub(1), col.checked_sub(1)),
        (row.checked_sub(1), Some(col)),
        (Some(row), col.checked_sub(1)),
        (Some(row), Some(col)),
    ];
    for (row_start, col_start) in starts {
        let (Some(r), Some(c)) = (row_start, col_start) else {
            continue;
        };
        if r + 1 >= size || c + 1 >= size {
            continue;
        }
        let indexes = [r * size + c, r * size + c + 1, (r + 1) * size + c, (r + 1) * size + c + 1];
        if indexes.iter().all(|index| board[*index] == value) {
            return false;
        }
    }
    true
}

fn yinyang_connected(size: usize, board: &[u8], color: u8) -> bool {
    let total = size * size;
    let mut start = None;
    let mut count = 0usize;
    for index in 0..total {
        if board[index] == color {
            count += 1;
            if start.is_none() {
                start = Some(index);
            }
        }
    }
    if count <= 1 {
        return true;
    }
    let Some(start) = start else {
        return true;
    };
    let mut seen = vec![false; total];
    let mut queue = std::collections::VecDeque::new();
    seen[start] = true;
    queue.push_back(start);
    let mut reached = 1usize;
    while let Some(position) = queue.pop_front() {
        let row = position / size;
        let col = position % size;
        let neighbors = [
            row.checked_sub(1).map(|r| r * size + col),
            (row + 1 < size).then_some((row + 1) * size + col),
            col.checked_sub(1).map(|c| row * size + c),
            (col + 1 < size).then_some(row * size + col + 1),
        ];
        for neighbor in neighbors.into_iter().flatten() {
            if !seen[neighbor] && board[neighbor] == color {
                seen[neighbor] = true;
                reached += 1;
                queue.push_back(neighbor);
            }
        }
    }
    reached == count
}

fn object_with_pairs(pairs: &[(&str, &str)]) -> JsValue {
    let object = Object::new();
    for (key, value) in pairs {
        let parsed_number = value.parse::<f64>().ok();
        let js_value = parsed_number
            .map(JsValue::from_f64)
            .unwrap_or_else(|| JsValue::from_str(value));
        let _ = Reflect::set(object.as_ref(), &JsValue::from_str(key), &js_value);
    }
    object.into()
}

fn array_from_strings(items: &[&str]) -> JsValue {
    let array = Array::new();
    for item in items {
        array.push(&JsValue::from_str(item));
    }
    array.into()
}

fn yinyang_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initYinyangGrid&&window.initYinyangGrid()", "", false),
        (
            "计算核心分析",
            "window.solveYinyangPuzzleUI&&window.solveYinyangPuzzleUI()",
            "yy-solve-btn",
            true,
        ),
        ("清空填涂", "window.clearYinyangGrid&&window.clearYinyangGrid()", "", false),
        (
            "简单示例",
            "window.buildSimpleYinyangExample&&window.buildSimpleYinyangExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_starbattle_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("starbattle-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let star_input = "<div style=\"margin-bottom:1rem;display:flex;gap:10px;align-items:center;justify-content:center\"><label style=\"color:var(--neon-cyan);font-size:.85rem;font-weight:700\">★ 星星数</label><input type=\"text\" inputmode=\"numeric\" id=\"sb-stars\" value=\"1\" style=\"width:50px;height:32px;text-align:center;background:rgba(255,255,255,.06);border:1px solid rgba(0,255,231,.3);border-radius:6px;color:#fff;font-size:.95rem;font-weight:700;outline:0\"></div>";
    let mode_button = "<div style=\"margin-bottom:1.5rem;display:flex;gap:10px\"><button class=\"cyber-button\" style=\"flex:1\" id=\"sb-mode-btn\" onclick=\"window.toggleSBMode && window.toggleSBMode()\"><span class=\"cyber-button__tag\">模式: 编辑区域</span></button></div>";
    let left = format!(
        "{}{}{}{}{}{}{}{}{}",
        logic_back_button("starbattle-workspace"),
        logic_title("STAR BATTLE", &object_with_pairs(&[("color", "var(--neon-cyan)")])),
        logic_size_inputs(
            "sb-rows",
            "sb-cols",
            &object_with_pairs(&[
                ("rowVal", "5"),
                ("colVal", "5"),
                ("rowMin", "4"),
                ("colMin", "4"),
                ("rowMax", "14"),
                ("colMax", "14")
            ])
        ),
        star_input,
        logic_action_grid4(&starbattle_action_buttons()),
        mode_button,
        logic_stats_panel("sb", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("sb", "showSBSol", &object_with_pairs(&[("accent", "var(--neon-cyan)")])),
        logic_instructions(
            &array_from_strings(&[
                "区域模式: 点击/拖拽网格线绘制区域边界",
                "星星模式: 点击格子放置/移除 ★",
                "每行、每列、每个粗线区域恰好放置指定数量的 ★",
                "★ 之间不能相邻（含对角线八方向）",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "starbattle-workspace",
        "starbattle-layout",
        &left,
        "<div id=\"sb-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none\"></div>",
        Some(
            "#sb-grid-container{gap:0}
        .sb-cell{width:40px;height:40px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.4rem;color:var(--neon-cyan);font-weight:700;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
        .sb-cell:hover{background:rgba(0,255,231,.08)}
        .sb-cell.star{text-shadow:0 0 8px var(--neon-cyan)}.sb-cell.sol{color:#0f0;text-shadow:0 0 10px rgba(0,255,0,.6)}
        .sb-cell.bt{border-top:3px solid var(--neon-cyan)}.sb-cell.bb{border-bottom:3px solid var(--neon-cyan)}.sb-cell.bl{border-left:3px solid var(--neon-cyan)}.sb-cell.br{border-right:3px solid var(--neon-cyan)}
        .sb-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .sb-line.h-line{height:7px;background:rgba(255,255,255,.08)}.sb-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .sb-line:hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .sb-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_starbattle_globals()?;
    install_starbattle_document_events()?;
    Ok(())
}

fn install_starbattle_globals() -> Result<(), JsValue> {
    let toggle = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = toggle_starbattle_mode() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("toggleSBMode"), toggle.as_ref())?;
    toggle.forget();

    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_starbattle_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initSBGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_starbattle_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearSBGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_starbattle_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("buildSBExample"), example.as_ref())?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_starbattle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveSBUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_starbattle_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showSBSol"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn install_starbattle_document_events() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(document.as_ref(), &JsValue::from_str("__rustStarbattleMouseupReady"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustStarbattleMouseupReady"),
        &JsValue::TRUE,
    )?;
    let mouseup = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        STARBATTLE_DRAG.with(|drag| *drag.borrow_mut() = None);
    }));
    document.add_event_listener_with_callback("mouseup", mouseup.as_ref().unchecked_ref())?;
    mouseup.forget();
    Ok(())
}

fn init_starbattle_grid() -> Result<(), JsValue> {
    let (rows, cols, stars) = read_starbattle_dimensions();
    STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.stars = stars;
        state.user_stars = empty_bool_grid(rows, cols);
        state.h_boundaries = empty_bool_grid(rows, cols);
        state.v_boundaries = empty_bool_grid(rows, cols);
        state.mode = StarBattleMode::Edit;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_starbattle_mode_button(StarBattleMode::Edit);
    set_starbattle_stats("-", "-");
    set_starbattle_nav(false);
    render_starbattle_grid()
}

fn clear_starbattle_grid() -> Result<(), JsValue> {
    STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.user_stars = empty_bool_grid(state.rows, state.cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_starbattle_stats("-", "-");
    set_starbattle_nav(false);
    render_starbattle_grid()
}

fn build_starbattle_example() -> Result<(), JsValue> {
    set_input_value("sb-rows", "5");
    set_input_value("sb-cols", "5");
    set_input_value("sb-stars", "1");
    STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 5;
        state.cols = 5;
        state.stars = 1;
        state.user_stars = empty_bool_grid(5, 5);
        state.h_boundaries = empty_bool_grid(5, 5);
        state.v_boundaries = empty_bool_grid(5, 5);
        state.mode = StarBattleMode::Edit;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
        state.h_boundaries[0][3] = true;
        state.h_boundaries[1][0] = true;
        state.h_boundaries[1][1] = true;
        state.h_boundaries[2][1] = true;
        state.h_boundaries[2][2] = true;
        state.h_boundaries[2][3] = true;
        state.h_boundaries[2][4] = true;
        state.h_boundaries[3][1] = true;
        state.v_boundaries[0][1] = true;
        state.v_boundaries[0][3] = true;
        state.v_boundaries[1][1] = true;
        state.v_boundaries[1][2] = true;
        state.v_boundaries[2][1] = true;
        state.v_boundaries[2][2] = true;
        state.v_boundaries[3][0] = true;
        state.v_boundaries[4][1] = true;
    });
    set_starbattle_mode_button(StarBattleMode::Edit);
    set_starbattle_stats("-", "-");
    set_starbattle_nav(false);
    render_starbattle_grid()
}

fn toggle_starbattle_mode() -> Result<(), JsValue> {
    let mode = STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.mode = if state.mode == StarBattleMode::Edit {
            StarBattleMode::Star
        } else {
            StarBattleMode::Edit
        };
        state.mode
    });
    set_starbattle_mode_button(mode);
    render_starbattle_grid()
}

fn solve_starbattle_ui() -> Result<(), JsValue> {
    let (rows, cols, stars) = read_starbattle_dimensions();
    let regions = STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.stars = stars;
        state.user_stars.resize(rows, Vec::new());
        for row in &mut state.user_stars {
            row.resize(cols, false);
        }
        starbattle_regions(&state)
    });
    if regions.is_empty() {
        set_starbattle_stats("请先绘制区域", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_starbattle(rows, cols, stars, &regions);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_starbattle_stats(&count_text, &elapsed);
    set_starbattle_nav(has_solution);
    if has_solution {
        show_starbattle_solution(0)
    } else {
        render_starbattle_grid()
    }
}

fn show_starbattle_solution(delta: isize) -> Result<(), JsValue> {
    STARBATTLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = STARBATTLE_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("sb-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_starbattle_grid()
}

fn render_starbattle_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("sb-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = STARBATTLE_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},40px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},40px)", state.rows))?;

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("sb-cell");
            cell.set_attribute("data-r", &row.to_string())?;
            cell.set_attribute("data-c", &col.to_string())?;
            apply_starbattle_cell_boundaries(&cell, &state, row, col)?;
            if state.user_stars[row][col] {
                cell.class_list().add_1("star")?;
                cell.set_text_content(Some("★"));
            }
            if state.showing_solution
                && state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row).and_then(|row| row.get(col)))
                    .copied()
                    .unwrap_or(0)
                    != 0
            {
                cell.class_list().add_1("sol")?;
                cell.set_text_content(Some("★"));
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let should_render = STARBATTLE_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.mode != StarBattleMode::Star || state.showing_solution {
                        return false;
                    }
                    state.user_stars[row][col] = !state.user_stars[row][col];
                    true
                });
                if should_render {
                    if let Err(err) = render_starbattle_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            let node: Node = cell.into();
            container.append_child(&node)?;
        }
    }

    if state.mode == StarBattleMode::Edit {
        render_starbattle_boundary_lines(&document, &container, &state)?;
    }
    Ok(())
}

fn render_starbattle_boundary_lines(
    document: &Document,
    container: &Element,
    state: &StarBattleState,
) -> Result<(), JsValue> {
    let cell_size = 40usize;
    let padding = 10usize;
    for row in 0..state.rows.saturating_sub(1) {
        for col in 0..state.cols {
            let css = format!(
                "left:{}px;top:{}px;width:{}px",
                padding + col * cell_size,
                padding + (row + 1) * cell_size - 3,
                cell_size
            );
            let line = starbattle_boundary_line(document, true, row, col, state.h_boundaries[row][col], &css)?;
            container.append_child(&line)?;
        }
    }
    for row in 0..state.rows {
        for col in 0..state.cols.saturating_sub(1) {
            let css = format!(
                "left:{}px;top:{}px;height:{}px",
                padding + (col + 1) * cell_size - 3,
                padding + row * cell_size,
                cell_size
            );
            let line = starbattle_boundary_line(document, false, row, col, state.v_boundaries[row][col], &css)?;
            container.append_child(&line)?;
        }
    }
    Ok(())
}

fn starbattle_boundary_line(
    document: &Document,
    horizontal: bool,
    row: usize,
    col: usize,
    active: bool,
    css: &str,
) -> Result<Node, JsValue> {
    let line = document.create_element("div")?;
    line.set_class_name(if horizontal { "sb-line h-line" } else { "sb-line v-line" });
    if active {
        line.class_list().add_1("active")?;
    }
    line.unchecked_ref::<HtmlElement>().style().set_css_text(css);

    let down = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        event.prevent_default();
        event.stop_propagation();
        let next = STARBATTLE_STATE.with(|state| {
            let mut state = state.borrow_mut();
            let boundaries = if horizontal {
                &mut state.h_boundaries
            } else {
                &mut state.v_boundaries
            };
            boundaries[row][col] = !boundaries[row][col];
            boundaries[row][col]
        });
        STARBATTLE_DRAG.with(|drag| *drag.borrow_mut() = Some(next));
        if let Err(err) = render_starbattle_grid() {
            console::error_1(&err);
        }
    }));
    line.add_event_listener_with_callback("mousedown", down.as_ref().unchecked_ref())?;
    down.forget();

    let enter = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        let Some(next) = STARBATTLE_DRAG.with(|drag| *drag.borrow()) else {
            return;
        };
        STARBATTLE_STATE.with(|state| {
            let mut state = state.borrow_mut();
            let boundaries = if horizontal {
                &mut state.h_boundaries
            } else {
                &mut state.v_boundaries
            };
            boundaries[row][col] = next;
        });
        if let Err(err) = render_starbattle_grid() {
            console::error_1(&err);
        }
    }));
    line.add_event_listener_with_callback("mouseenter", enter.as_ref().unchecked_ref())?;
    enter.forget();

    Ok(line.into())
}

fn apply_starbattle_cell_boundaries(
    cell: &Element,
    state: &StarBattleState,
    row: usize,
    col: usize,
) -> Result<(), JsValue> {
    if row == 0 || (row > 0 && state.h_boundaries[row - 1][col]) {
        cell.class_list().add_1("bt")?;
    }
    if row + 1 == state.rows || (row + 1 < state.rows && state.h_boundaries[row][col]) {
        cell.class_list().add_1("bb")?;
    }
    if col == 0 || (col > 0 && state.v_boundaries[row][col - 1]) {
        cell.class_list().add_1("bl")?;
    }
    if col + 1 == state.cols || (col + 1 < state.cols && state.v_boundaries[row][col]) {
        cell.class_list().add_1("br")?;
    }
    Ok(())
}

fn starbattle_regions(state: &StarBattleState) -> Vec<Vec<usize>> {
    let mut visited = empty_bool_grid(state.rows, state.cols);
    let mut regions = Vec::new();
    for row in 0..state.rows {
        for col in 0..state.cols {
            if visited[row][col] {
                continue;
            }
            let mut region = Vec::new();
            let mut queue = VecDeque::new();
            visited[row][col] = true;
            queue.push_back((row, col));
            while let Some((current_row, current_col)) = queue.pop_front() {
                region.push(current_row * state.cols + current_col);
                let neighbors = [
                    current_row.checked_sub(1).map(|r| (r, current_col, current_row - 1, current_col, true)),
                    (current_row + 1 < state.rows).then_some((current_row + 1, current_col, current_row, current_col, true)),
                    current_col.checked_sub(1).map(|c| (current_row, c, current_row, current_col - 1, false)),
                    (current_col + 1 < state.cols).then_some((current_row, current_col + 1, current_row, current_col, false)),
                ];
                for (next_row, next_col, boundary_row, boundary_col, horizontal) in neighbors.into_iter().flatten() {
                    if visited[next_row][next_col] {
                        continue;
                    }
                    let blocked = if horizontal {
                        state.h_boundaries[boundary_row][boundary_col]
                    } else {
                        state.v_boundaries[boundary_row][boundary_col]
                    };
                    if blocked {
                        continue;
                    }
                    visited[next_row][next_col] = true;
                    queue.push_back((next_row, next_col));
                }
            }
            regions.push(region);
        }
    }
    regions
}

struct StarBattleSolveResult {
    solutions: Vec<Vec<Vec<u8>>>,
    timed_out: bool,
}

fn solve_starbattle(
    rows: usize,
    cols: usize,
    stars: usize,
    regions: &[Vec<usize>],
) -> StarBattleSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const STEP_LIMIT: usize = 2_500_000;

    if regions.iter().any(|region| region.len() < stars) {
        return StarBattleSolveResult {
            solutions: Vec::new(),
            timed_out: false,
        };
    }

    let total = rows * cols;
    let mut region_by_cell = vec![0usize; total];
    for (region_index, region) in regions.iter().enumerate() {
        for position in region {
            region_by_cell[*position] = region_index;
        }
    }
    let mut row_count = vec![0usize; rows];
    let mut col_count = vec![0usize; cols];
    let mut region_count = vec![0usize; regions.len()];
    let mut row_remaining = vec![cols; rows];
    let mut col_remaining = vec![rows; cols];
    let mut region_remaining = regions.iter().map(Vec::len).collect::<Vec<_>>();
    let mut grid = vec![0u8; total];
    let mut result = StarBattleSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;

    starbattle_dfs(
        0,
        rows,
        cols,
        stars,
        &region_by_cell,
        &mut row_count,
        &mut col_count,
        &mut region_count,
        &mut row_remaining,
        &mut col_remaining,
        &mut region_remaining,
        &mut grid,
        &mut result,
        &mut steps,
        MAX_SOLUTIONS,
        STEP_LIMIT,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn starbattle_dfs(
    index: usize,
    rows: usize,
    cols: usize,
    stars: usize,
    region_by_cell: &[usize],
    row_count: &mut [usize],
    col_count: &mut [usize],
    region_count: &mut [usize],
    row_remaining: &mut [usize],
    col_remaining: &mut [usize],
    region_remaining: &mut [usize],
    grid: &mut [u8],
    result: &mut StarBattleSolveResult,
    steps: &mut usize,
    max_solutions: usize,
    step_limit: usize,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if *steps > step_limit {
        result.timed_out = true;
        return;
    }
    let total = rows * cols;
    if index >= total {
        if row_count.iter().all(|count| *count == stars)
            && col_count.iter().all(|count| *count == stars)
        {
            let mut solution = vec![vec![0; cols]; rows];
            for row in 0..rows {
                for col in 0..cols {
                    solution[row][col] = grid[row * cols + col];
                }
            }
            result.solutions.push(solution);
        }
        return;
    }

    let row = index / cols;
    let col = index % cols;
    let region = region_by_cell[index];
    row_remaining[row] = row_remaining[row].saturating_sub(1);
    col_remaining[col] = col_remaining[col].saturating_sub(1);
    region_remaining[region] = region_remaining[region].saturating_sub(1);

    if row_count[row] < stars
        && col_count[col] < stars
        && region_count[region] < stars
        && starbattle_can_place(rows, cols, grid, index)
    {
        grid[index] = 1;
        row_count[row] += 1;
        col_count[col] += 1;
        region_count[region] += 1;
        if starbattle_can_complete(row, col, region, stars, row_count, col_count, region_count, row_remaining, col_remaining, region_remaining) {
            starbattle_dfs(
                index + 1,
                rows,
                cols,
                stars,
                region_by_cell,
                row_count,
                col_count,
                region_count,
                row_remaining,
                col_remaining,
                region_remaining,
                grid,
                result,
                steps,
                max_solutions,
                step_limit,
            );
        }
        grid[index] = 0;
        row_count[row] -= 1;
        col_count[col] -= 1;
        region_count[region] -= 1;
    }

    if starbattle_can_complete(row, col, region, stars, row_count, col_count, region_count, row_remaining, col_remaining, region_remaining) {
        starbattle_dfs(
            index + 1,
            rows,
            cols,
            stars,
            region_by_cell,
            row_count,
            col_count,
            region_count,
            row_remaining,
            col_remaining,
            region_remaining,
            grid,
            result,
            steps,
            max_solutions,
            step_limit,
        );
    }

    row_remaining[row] += 1;
    col_remaining[col] += 1;
    region_remaining[region] += 1;
}

fn starbattle_can_place(rows: usize, cols: usize, grid: &[u8], index: usize) -> bool {
    let row = index / cols;
    let col = index % cols;
    for row_delta in [-1isize, 0, 1] {
        for col_delta in [-1isize, 0, 1] {
            if row_delta == 0 && col_delta == 0 {
                continue;
            }
            let next_row = row as isize + row_delta;
            let next_col = col as isize + col_delta;
            if next_row < 0 || next_row >= rows as isize || next_col < 0 || next_col >= cols as isize {
                continue;
            }
            if grid[next_row as usize * cols + next_col as usize] != 0 {
                return false;
            }
        }
    }
    true
}

#[allow(clippy::too_many_arguments)]
fn starbattle_can_complete(
    row: usize,
    col: usize,
    region: usize,
    stars: usize,
    row_count: &[usize],
    col_count: &[usize],
    region_count: &[usize],
    row_remaining: &[usize],
    col_remaining: &[usize],
    region_remaining: &[usize],
) -> bool {
    row_count[row] + row_remaining[row] >= stars
        && col_count[col] + col_remaining[col] >= stars
        && region_count[region] + region_remaining[region] >= stars
}

fn read_starbattle_dimensions() -> (usize, usize, usize) {
    let rows = read_usize_input("sb-rows", 5).clamp(4, 14);
    let cols = read_usize_input("sb-cols", 5).clamp(4, 14);
    let stars = read_usize_input("sb-stars", 1).clamp(1, 5);
    set_input_value("sb-rows", &rows.to_string());
    set_input_value("sb-cols", &cols.to_string());
    set_input_value("sb-stars", &stars.to_string());
    (rows, cols, stars)
}

fn set_starbattle_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("sb-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("sb-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_starbattle_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("sb-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn set_starbattle_mode_button(mode: StarBattleMode) {
    if let Ok(document) = document() {
        if let Some(tag) = document
            .get_element_by_id("sb-mode-btn")
            .and_then(|button| button.query_selector(".cyber-button__tag").ok().flatten())
        {
            tag.set_text_content(Some(if mode == StarBattleMode::Edit {
                "模式: 编辑区域"
            } else {
                "模式: 放置星星"
            }));
        }
    }
}

fn empty_bool_grid(rows: usize, cols: usize) -> Vec<Vec<bool>> {
    vec![vec![false; cols]; rows]
}

fn read_usize_input(id: &str, fallback: usize) -> usize {
    document()
        .ok()
        .and_then(|document| document.get_element_by_id(id))
        .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
        .and_then(|input| input.value().parse::<usize>().ok())
        .unwrap_or(fallback)
}

fn set_input_value(id: &str, value: &str) {
    if let Ok(document) = document() {
        if let Some(input) = document
            .get_element_by_id(id)
            .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
        {
            input.set_value(value);
        }
    }
}

fn starbattle_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initSBGrid && window.initSBGrid()", "", false),
        ("计算核心分析", "window.solveSBUI && window.solveSBUI()", "sb-solve-btn", true),
        ("清空填涂", "window.clearSBGrid && window.clearSBGrid()", "", false),
        ("简单示例", "window.buildSBExample && window.buildSBExample()", "", false),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_shikaku_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("shikaku-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("shikaku-workspace"),
        logic_title("SHIKAKU", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "shk-rows",
            "shk-cols",
            &object_with_pairs(&[
                ("rowVal", "7"),
                ("colVal", "7"),
                ("rowMin", "2"),
                ("colMin", "2"),
                ("rowMax", "15"),
                ("colMax", "15")
            ])
        ),
        logic_action_grid4(&shikaku_action_buttons()),
        logic_stats_panel("shk", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("shk", "showShikakuSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "点击格子输入数字（矩形面积线索）",
                "将整个网格划分为若干矩形",
                "每个矩形恰好包含一个数字，数字等于矩形面积",
                "支持键盘方向键移动、数字键输入、Delete 清除",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "shikaku-workspace",
        "shikaku-layout",
        &left,
        "<div id=\"shk-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none\"></div>",
        Some(
            "#shk-grid-container{gap:0}
        .shk-cell{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;cursor:pointer;user-select:none;box-sizing:border-box}
        .shk-cell:hover{background:rgba(0,255,231,.08)}
        .shk-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .shk-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .shk-cell input.shk-inp{width:100%;height:100%;border:0;background:transparent;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .shk-cell.bt{border-top:3px solid var(--hologram-purple,#b388ff)!important}
        .shk-cell.bb{border-bottom:3px solid var(--hologram-purple,#b388ff)!important}
        .shk-cell.bl{border-left:3px solid var(--hologram-purple,#b388ff)!important}
        .shk-cell.br{border-right:3px solid var(--hologram-purple,#b388ff)!important}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_shikaku_globals()?;
    Ok(())
}

fn install_shikaku_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_shikaku_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initShikakuGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_shikaku_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearShikakuGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_shikaku_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleShikakuExample"),
        example.as_ref(),
    )?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_shikaku_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("solveShikakuPuzzleUI"),
        solve.as_ref(),
    )?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_shikaku_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("showShikakuSolution"),
        show.as_ref(),
    )?;
    show.forget();
    Ok(())
}

fn init_shikaku_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_shikaku_dimensions();
    SHIKAKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.clues = empty_option_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_shikaku_stats("-", "-");
    set_shikaku_nav(false);
    render_shikaku_grid()
}

fn clear_shikaku_grid() -> Result<(), JsValue> {
    SHIKAKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rows = state.rows;
        let cols = state.cols;
        state.clues = empty_option_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_shikaku_stats("-", "-");
    set_shikaku_nav(false);
    render_shikaku_grid()
}

fn build_simple_shikaku_example() -> Result<(), JsValue> {
    set_input_value("shk-rows", "4");
    set_input_value("shk-cols", "4");
    SHIKAKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 4;
        state.cols = 4;
        state.clues = empty_option_grid(4, 4);
        state.clues[0][0] = Some(4);
        state.clues[0][2] = Some(4);
        state.clues[2][0] = Some(4);
        state.clues[2][2] = Some(4);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_shikaku_stats("-", "-");
    set_shikaku_nav(false);
    render_shikaku_grid()
}

fn solve_shikaku_puzzle_ui() -> Result<(), JsValue> {
    let snapshot = SHIKAKU_STATE.with(|state| state.borrow().clone());
    if shikaku_clue_count(&snapshot.clues) == 0 {
        set_shikaku_stats("请先输入线索", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_shikaku(snapshot.rows, snapshot.cols, &snapshot.clues);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    SHIKAKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_shikaku_stats(&count_text, &elapsed);
    set_shikaku_nav(has_solution);
    if has_solution {
        show_shikaku_solution(0)
    } else {
        render_shikaku_grid()
    }
}

fn show_shikaku_solution(delta: isize) -> Result<(), JsValue> {
    SHIKAKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = SHIKAKU_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("shk-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_shikaku_grid()
}

fn render_shikaku_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("shk-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = SHIKAKU_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},42px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},42px)", state.rows))?;

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("shk-cell");
            cell.set_attribute("data-r", &row.to_string())?;
            cell.set_attribute("data-c", &col.to_string())?;
            apply_shikaku_boundaries(&cell, &state, row, col)?;
            if let Some(value) = state.clues[row][col] {
                cell.class_list().add_1("clue")?;
                cell.set_text_content(Some(&value.to_string()));
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                if let Err(err) = edit_shikaku_cell(row, col) {
                    console::error_1(&err);
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            let node: Node = cell.into();
            container.append_child(&node)?;
        }
    }
    Ok(())
}

fn edit_shikaku_cell(row: usize, col: usize) -> Result<(), JsValue> {
    let showing = SHIKAKU_STATE.with(|state| state.borrow().showing_solution);
    if showing {
        return Ok(());
    }
    let document = document()?;
    let Some(container) = document.get_element_by_id("shk-grid-container") else {
        return Ok(());
    };
    let selector = format!(".shk-cell[data-r=\"{row}\"][data-c=\"{col}\"]");
    let Some(cell) = container.query_selector(&selector)? else {
        return Ok(());
    };
    let current = SHIKAKU_STATE.with(|state| {
        state
            .borrow()
            .clues
            .get(row)
            .and_then(|items| items.get(col))
            .and_then(|value| *value)
    });
    cell.class_list().add_1("editing")?;
    cell.set_text_content(None);

    let input = document.create_element("input")?.dyn_into::<HtmlInputElement>()?;
    input.set_type("text");
    input.set_input_mode("numeric");
    input.set_class_name("shk-inp");
    input.set_attribute("maxlength", "3")?;
    if let Some(value) = current {
        input.set_value(&value.to_string());
    }
    cell.append_child(input.as_ref())?;
    input.focus()?;

    let input_for_blur = input.clone();
    let blur = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        commit_shikaku_value(row, col, &input_for_blur.value());
        if let Err(err) = render_shikaku_grid() {
            console::error_1(&err);
        }
    }));
    input.add_event_listener_with_callback("blur", blur.as_ref().unchecked_ref())?;
    blur.forget();

    let input_for_key = input.clone();
    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        let key = event.key();
        if key == "Enter" {
            let _ = input_for_key.blur();
        } else if key == "Escape" || key == "Delete" || key == "Backspace" {
            input_for_key.set_value("");
            let _ = input_for_key.blur();
        } else if key.starts_with("Arrow") {
            event.prevent_default();
            let _ = input_for_key.blur();
            let (rows, cols) = SHIKAKU_STATE.with(|state| {
                let state = state.borrow();
                (state.rows, state.cols)
            });
            let mut next_row = row;
            let mut next_col = col;
            if key == "ArrowUp" && next_row > 0 {
                next_row -= 1;
            } else if key == "ArrowDown" && next_row + 1 < rows {
                next_row += 1;
            } else if key == "ArrowLeft" && next_col > 0 {
                next_col -= 1;
            } else if key == "ArrowRight" && next_col + 1 < cols {
                next_col += 1;
            }
            if next_row != row || next_col != col {
                let jump = Closure::<dyn FnMut()>::wrap(Box::new(move || {
                    if let Err(err) = edit_shikaku_cell(next_row, next_col) {
                        console::error_1(&err);
                    }
                }));
                if let Ok(win) = window() {
                    let _ = win.set_timeout_with_callback_and_timeout_and_arguments_0(
                        jump.as_ref().unchecked_ref(),
                        30,
                    );
                }
                jump.forget();
            }
        }
    }));
    input.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
    keydown.forget();
    Ok(())
}

fn commit_shikaku_value(row: usize, col: usize, value: &str) {
    let parsed = value
        .trim()
        .parse::<usize>()
        .ok()
        .filter(|value| *value > 0);
    SHIKAKU_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if row >= state.rows || col >= state.cols {
            return;
        }
        state.clues[row][col] = parsed;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
}

fn apply_shikaku_boundaries(
    cell: &Element,
    state: &ShikakuState,
    row: usize,
    col: usize,
) -> Result<(), JsValue> {
    if state.showing_solution {
        if let Some(solution) = state.solutions.get(state.solution_index) {
            let id = solution[row][col];
            let color = SHIKAKU_COLORS[id % SHIKAKU_COLORS.len()];
            cell.unchecked_ref::<HtmlElement>()
                .style()
                .set_property("background", color)?;
            if row == 0 || solution[row - 1][col] != id {
                cell.class_list().add_1("bt")?;
            }
            if row + 1 == state.rows || solution[row + 1][col] != id {
                cell.class_list().add_1("bb")?;
            }
            if col == 0 || solution[row][col - 1] != id {
                cell.class_list().add_1("bl")?;
            }
            if col + 1 == state.cols || solution[row][col + 1] != id {
                cell.class_list().add_1("br")?;
            }
            return Ok(());
        }
    }
    if row == 0 {
        cell.class_list().add_1("bt")?;
    }
    if row + 1 == state.rows {
        cell.class_list().add_1("bb")?;
    }
    if col == 0 {
        cell.class_list().add_1("bl")?;
    }
    if col + 1 == state.cols {
        cell.class_list().add_1("br")?;
    }
    Ok(())
}

struct ShikakuSolveResult {
    solutions: Vec<Vec<Vec<usize>>>,
    timed_out: bool,
}

fn solve_shikaku(rows: usize, cols: usize, clues: &[Vec<Option<usize>>]) -> ShikakuSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let total = rows * cols;
    let mut clue_values = vec![0usize; total];
    let mut has_clue = vec![false; total];
    let mut clue_count = 0usize;
    for row in 0..rows {
        for col in 0..cols {
            if let Some(value) = clues[row][col] {
                clue_values[row * cols + col] = value;
                has_clue[row * cols + col] = true;
                clue_count += 1;
            }
        }
    }
    if clue_count == 0 {
        return ShikakuSolveResult {
            solutions: Vec::new(),
            timed_out: false,
        };
    }

    let mut coverage = vec![-1isize; total];
    let mut next_region_id = 0usize;
    let mut steps = 0usize;
    let started = js_sys::Date::now();
    let mut result = ShikakuSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    shikaku_dfs(
        rows,
        cols,
        &clue_values,
        &has_clue,
        &mut coverage,
        &mut next_region_id,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn shikaku_dfs(
    rows: usize,
    cols: usize,
    clue_values: &[usize],
    has_clue: &[bool],
    coverage: &mut [isize],
    next_region_id: &mut usize,
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut ShikakuSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }

    let total = rows * cols;
    let Some(position) = (0..total).find(|index| coverage[*index] < 0) else {
        let mut solution = vec![vec![0usize; cols]; rows];
        for row in 0..rows {
            for col in 0..cols {
                solution[row][col] = coverage[row * cols + col] as usize;
            }
        }
        result.solutions.push(solution);
        return;
    };

    let start_row = position / cols;
    let start_col = position % cols;
    for height in 1..=(rows - start_row) {
        if coverage[(start_row + height - 1) * cols + start_col] >= 0 {
            break;
        }
        let mut clues_in_rect = 0usize;
        let mut clue_value = 0usize;
        for width in 1..=(cols - start_col) {
            let mut blocked = false;
            for delta_row in 0..height {
                if coverage[(start_row + delta_row) * cols + start_col + width - 1] >= 0 {
                    blocked = true;
                    break;
                }
            }
            if blocked {
                break;
            }
            for delta_row in 0..height {
                let index = (start_row + delta_row) * cols + start_col + width - 1;
                if has_clue[index] {
                    clues_in_rect += 1;
                    clue_value = clue_values[index];
                }
            }
            if clues_in_rect > 1 {
                break;
            }
            if clues_in_rect == 1 && clue_value == height * width {
                let id = *next_region_id as isize;
                *next_region_id += 1;
                for delta_row in 0..height {
                    for delta_col in 0..width {
                        coverage[(start_row + delta_row) * cols + start_col + delta_col] = id;
                    }
                }
                shikaku_dfs(
                    rows,
                    cols,
                    clue_values,
                    has_clue,
                    coverage,
                    next_region_id,
                    steps,
                    started,
                    time_limit_ms,
                    max_solutions,
                    result,
                );
                for delta_row in 0..height {
                    for delta_col in 0..width {
                        coverage[(start_row + delta_row) * cols + start_col + delta_col] = -1;
                    }
                }
                *next_region_id -= 1;
                if result.timed_out || result.solutions.len() >= max_solutions {
                    return;
                }
            }
        }
    }
}

fn read_shikaku_dimensions() -> (usize, usize) {
    let rows = read_usize_input("shk-rows", 7).clamp(2, 15);
    let cols = read_usize_input("shk-cols", 7).clamp(2, 15);
    set_input_value("shk-rows", &rows.to_string());
    set_input_value("shk-cols", &cols.to_string());
    (rows, cols)
}

fn set_shikaku_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("shk-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("shk-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_shikaku_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("shk-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn shikaku_clue_count(clues: &[Vec<Option<usize>>]) -> usize {
    clues
        .iter()
        .map(|row| row.iter().filter(|value| value.is_some()).count())
        .sum()
}

fn empty_option_grid(rows: usize, cols: usize) -> Vec<Vec<Option<usize>>> {
    vec![vec![None; cols]; rows]
}

const SHIKAKU_COLORS: &[&str] = &[
    "rgba(0,255,231,.12)",
    "rgba(178,102,255,.12)",
    "rgba(255,64,129,.12)",
    "rgba(0,176,255,.12)",
    "rgba(255,214,0,.12)",
    "rgba(105,240,174,.12)",
    "rgba(255,138,101,.12)",
    "rgba(130,177,255,.12)",
    "rgba(255,82,82,.12)",
    "rgba(0,230,118,.12)",
    "rgba(234,128,252,.12)",
    "rgba(100,255,218,.12)",
    "rgba(255,171,64,.12)",
    "rgba(64,196,255,.12)",
    "rgba(255,110,64,.12)",
    "rgba(29,233,182,.12)",
    "rgba(213,0,249,.12)",
    "rgba(0,200,83,.12)",
    "rgba(255,61,0,.12)",
    "rgba(24,255,255,.12)",
];

fn shikaku_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initShikakuGrid && window.initShikakuGrid()", "", false),
        (
            "计算核心分析",
            "window.solveShikakuPuzzleUI && window.solveShikakuPuzzleUI()",
            "shk-solve-btn",
            true,
        ),
        ("清空填涂", "window.clearShikakuGrid && window.clearShikakuGrid()", "", false),
        (
            "简单示例",
            "window.buildSimpleShikakuExample && window.buildSimpleShikakuExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_ripple_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("rippleeffect-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let mode_button = "<div style=\"margin-bottom:1.5rem;display:flex;gap:10px\"><button class=\"cyber-button\" style=\"flex:1\" id=\"rip-mode-btn\" onclick=\"window.toggleRippleMode && window.toggleRippleMode()\"><span class=\"cyber-button__tag\">模式: 调整边界</span></button></div>";
    let left = format!(
        "{}{}{}{}{}{}{}{}",
        logic_back_button("rippleeffect-workspace"),
        logic_title("RIPPLE EFFECT", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "rip-rows",
            "rip-cols",
            &object_with_pairs(&[
                ("rowVal", "6"),
                ("colVal", "6"),
                ("rowMin", "2"),
                ("colMin", "2"),
                ("rowMax", "12"),
                ("colMax", "12")
            ])
        ),
        logic_action_grid4(&ripple_action_buttons()),
        mode_button,
        logic_stats_panel("rip", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("rip", "showRippleSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "边界模式: 点击/拖拽网格线绘制房间边界",
                "数字模式: 点击格子输入已知线索数字",
                "大小为 N 的区域中必须填入 1~N (各一次)",
                "若两个相同数字 X 在同行/同列，间距须 > X",
                "最大网格 12×12",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "rippleeffect-workspace",
        "rippleeffect-layout",
        &left,
        "<div id=\"rip-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none\"></div>",
        Some(
            "#rip-grid-container{gap:0}
        .rip-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.1rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative}
        .rip-cell:hover{background:rgba(0,255,231,.08)}
        .rip-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .rip-cell.solved{color:#0f0;text-shadow:0 0 8px rgba(0,255,0,.5)}
        .rip-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}
        .rip-cell.bt{border-top:3px solid var(--neon-cyan)}.rip-cell.bb{border-bottom:3px solid var(--neon-cyan)}.rip-cell.bl{border-left:3px solid var(--neon-cyan)}.rip-cell.br{border-right:3px solid var(--neon-cyan)}
        .rip-cell input.ki{width:100%;height:100%;border:0;background:transparent;color:#fff;text-align:center;font-size:.95rem;font-weight:700;outline:0;padding:0;margin:0}
        .rip-line{position:absolute;z-index:50;cursor:pointer;transition:background .15s}
        .rip-line.h-line{height:7px;background:rgba(255,255,255,.08)}
        .rip-line.v-line{width:7px;background:rgba(255,255,255,.08)}
        .rip-line:hover{background:#00ffe7!important;box-shadow:0 0 6px #00ffe7!important}
        .rip-line.active{background:#00ffe7!important;box-shadow:0 0 5px #00ffe7,0 0 2px #00ffe7 inset!important}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_ripple_globals()?;
    install_ripple_document_events()?;
    Ok(())
}

fn install_ripple_globals() -> Result<(), JsValue> {
    let toggle = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = toggle_ripple_mode() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("toggleRippleMode"), toggle.as_ref())?;
    toggle.forget();

    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_ripple_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initRippleGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_ripple_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearRippleGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_ripple_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleRippleExample"),
        example.as_ref(),
    )?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_ripple_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveRippleUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_ripple_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showRippleSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn install_ripple_document_events() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(document.as_ref(), &JsValue::from_str("__rustRippleMouseupReady"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustRippleMouseupReady"),
        &JsValue::TRUE,
    )?;
    let mouseup = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        RIPPLE_DRAG.with(|drag| *drag.borrow_mut() = None);
    }));
    document.add_event_listener_with_callback("mouseup", mouseup.as_ref().unchecked_ref())?;
    mouseup.forget();
    Ok(())
}

fn init_ripple_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_ripple_dimensions();
    RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.clues = empty_option_grid(rows, cols);
        state.h_boundaries = empty_bool_grid(rows, cols);
        state.v_boundaries = empty_bool_grid(rows, cols);
        state.mode = RippleMode::Boundary;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_ripple_mode_button(RippleMode::Boundary);
    set_ripple_stats("-", "-");
    set_ripple_nav(false);
    render_ripple_grid()
}

fn clear_ripple_grid() -> Result<(), JsValue> {
    RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rows = state.rows;
        let cols = state.cols;
        state.clues = empty_option_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_ripple_stats("-", "-");
    set_ripple_nav(false);
    render_ripple_grid()
}

fn build_simple_ripple_example() -> Result<(), JsValue> {
    set_input_value("rip-rows", "4");
    set_input_value("rip-cols", "4");
    RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 4;
        state.cols = 4;
        state.clues = empty_option_grid(4, 4);
        state.h_boundaries = empty_bool_grid(4, 4);
        state.v_boundaries = empty_bool_grid(4, 4);
        state.mode = RippleMode::Boundary;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
        for col in 0..4 {
            state.h_boundaries[1][col] = true;
        }
        for row in 0..4 {
            state.v_boundaries[row][1] = true;
        }
        state.clues[0][0] = Some(1);
        state.clues[0][2] = Some(2);
    });
    set_ripple_mode_button(RippleMode::Boundary);
    set_ripple_stats("-", "-");
    set_ripple_nav(false);
    render_ripple_grid()
}

fn toggle_ripple_mode() -> Result<(), JsValue> {
    let mode = RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.mode = if state.mode == RippleMode::Boundary {
            RippleMode::Number
        } else {
            RippleMode::Boundary
        };
        state.mode
    });
    set_ripple_mode_button(mode);
    render_ripple_grid()
}

fn solve_ripple_ui() -> Result<(), JsValue> {
    let snapshot = RIPPLE_STATE.with(|state| state.borrow().clone());
    let rooms = ripple_rooms(&snapshot);
    if rooms.is_empty() {
        set_ripple_stats("请先绘制房间", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_ripple(snapshot.rows, snapshot.cols, &rooms, &snapshot.clues);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_ripple_stats(&count_text, &elapsed);
    set_ripple_nav(has_solution);
    if has_solution {
        show_ripple_solution(0)
    } else {
        render_ripple_grid()
    }
}

fn show_ripple_solution(delta: isize) -> Result<(), JsValue> {
    RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = RIPPLE_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("rip-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_ripple_grid()
}

fn render_ripple_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("rip-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = RIPPLE_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},42px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},42px)", state.rows))?;

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("rip-cell");
            cell.set_attribute("data-r", &row.to_string())?;
            cell.set_attribute("data-c", &col.to_string())?;
            apply_ripple_cell_boundaries(&cell, &state, row, col)?;
            if let Some(value) = state.clues[row][col] {
                cell.class_list().add_1("clue")?;
                cell.set_text_content(Some(&value.to_string()));
            }
            if state.showing_solution {
                if let Some(value) = state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row).and_then(|items| items.get(col)))
                    .copied()
                    .filter(|value| *value > 0)
                {
                    cell.set_text_content(Some(&value.to_string()));
                    if state.clues[row][col].is_none() {
                        cell.class_list().add_1("solved")?;
                    }
                }
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let should_edit = RIPPLE_STATE.with(|state| {
                    let state = state.borrow();
                    state.mode == RippleMode::Number && !state.showing_solution
                });
                if should_edit {
                    if let Err(err) = edit_ripple_cell(row, col) {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            let node: Node = cell.into();
            container.append_child(&node)?;
        }
    }
    if state.mode == RippleMode::Boundary {
        render_ripple_boundary_lines(&document, &container, &state)?;
    }
    Ok(())
}

fn render_ripple_boundary_lines(
    document: &Document,
    container: &Element,
    state: &RippleState,
) -> Result<(), JsValue> {
    let cell_size = 42usize;
    let padding = 10usize;
    for row in 0..state.rows.saturating_sub(1) {
        for col in 0..state.cols {
            let css = format!(
                "left:{}px;top:{}px;width:{}px",
                padding + col * cell_size,
                padding + (row + 1) * cell_size - 3,
                cell_size
            );
            let line = ripple_boundary_line(document, true, row, col, state.h_boundaries[row][col], &css)?;
            container.append_child(&line)?;
        }
    }
    for row in 0..state.rows {
        for col in 0..state.cols.saturating_sub(1) {
            let css = format!(
                "left:{}px;top:{}px;height:{}px",
                padding + (col + 1) * cell_size - 3,
                padding + row * cell_size,
                cell_size
            );
            let line = ripple_boundary_line(document, false, row, col, state.v_boundaries[row][col], &css)?;
            container.append_child(&line)?;
        }
    }
    Ok(())
}

fn ripple_boundary_line(
    document: &Document,
    horizontal: bool,
    row: usize,
    col: usize,
    active: bool,
    css: &str,
) -> Result<Node, JsValue> {
    let line = document.create_element("div")?;
    line.set_class_name(if horizontal { "rip-line h-line" } else { "rip-line v-line" });
    if active {
        line.class_list().add_1("active")?;
    }
    line.unchecked_ref::<HtmlElement>().style().set_css_text(css);

    let down = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        event.prevent_default();
        event.stop_propagation();
        let next = RIPPLE_STATE.with(|state| {
            let mut state = state.borrow_mut();
            let boundaries = if horizontal {
                &mut state.h_boundaries
            } else {
                &mut state.v_boundaries
            };
            boundaries[row][col] = !boundaries[row][col];
            boundaries[row][col]
        });
        RIPPLE_DRAG.with(|drag| *drag.borrow_mut() = Some(next));
        if let Err(err) = render_ripple_grid() {
            console::error_1(&err);
        }
    }));
    line.add_event_listener_with_callback("mousedown", down.as_ref().unchecked_ref())?;
    down.forget();

    let enter = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        let Some(next) = RIPPLE_DRAG.with(|drag| *drag.borrow()) else {
            return;
        };
        RIPPLE_STATE.with(|state| {
            let mut state = state.borrow_mut();
            let boundaries = if horizontal {
                &mut state.h_boundaries
            } else {
                &mut state.v_boundaries
            };
            boundaries[row][col] = next;
        });
        if let Err(err) = render_ripple_grid() {
            console::error_1(&err);
        }
    }));
    line.add_event_listener_with_callback("mouseenter", enter.as_ref().unchecked_ref())?;
    enter.forget();

    Ok(line.into())
}

fn edit_ripple_cell(row: usize, col: usize) -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("rip-grid-container") else {
        return Ok(());
    };
    let selector = format!(".rip-cell[data-r=\"{row}\"][data-c=\"{col}\"]");
    let Some(cell) = container.query_selector(&selector)? else {
        return Ok(());
    };
    let current = RIPPLE_STATE.with(|state| {
        state
            .borrow()
            .clues
            .get(row)
            .and_then(|items| items.get(col))
            .and_then(|value| *value)
    });
    cell.class_list().add_1("editing")?;
    cell.set_text_content(None);

    let input = document.create_element("input")?.dyn_into::<HtmlInputElement>()?;
    input.set_type("text");
    input.set_input_mode("numeric");
    input.set_class_name("ki");
    input.set_attribute("maxlength", "2")?;
    if let Some(value) = current {
        input.set_value(&value.to_string());
    }
    cell.append_child(input.as_ref())?;
    input.focus()?;

    let input_for_blur = input.clone();
    let blur = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        commit_ripple_value(row, col, &input_for_blur.value());
        if let Err(err) = render_ripple_grid() {
            console::error_1(&err);
        }
    }));
    input.add_event_listener_with_callback("blur", blur.as_ref().unchecked_ref())?;
    blur.forget();

    let input_for_key = input.clone();
    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        let key = event.key();
        if key == "Enter" {
            let _ = input_for_key.blur();
        } else if key == "Escape" || key == "Delete" || key == "Backspace" {
            input_for_key.set_value("");
            let _ = input_for_key.blur();
        }
    }));
    input.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
    keydown.forget();
    Ok(())
}

fn commit_ripple_value(row: usize, col: usize, value: &str) {
    let parsed = value
        .trim()
        .parse::<usize>()
        .ok()
        .filter(|value| *value > 0);
    RIPPLE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if row >= state.rows || col >= state.cols {
            return;
        }
        state.clues[row][col] = parsed;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
}

fn apply_ripple_cell_boundaries(
    cell: &Element,
    state: &RippleState,
    row: usize,
    col: usize,
) -> Result<(), JsValue> {
    if row == 0 || (row > 0 && state.h_boundaries[row - 1][col]) {
        cell.class_list().add_1("bt")?;
    }
    if row + 1 == state.rows || (row + 1 < state.rows && state.h_boundaries[row][col]) {
        cell.class_list().add_1("bb")?;
    }
    if col == 0 || (col > 0 && state.v_boundaries[row][col - 1]) {
        cell.class_list().add_1("bl")?;
    }
    if col + 1 == state.cols || (col + 1 < state.cols && state.v_boundaries[row][col]) {
        cell.class_list().add_1("br")?;
    }
    Ok(())
}

fn ripple_rooms(state: &RippleState) -> Vec<Vec<usize>> {
    let mut visited = empty_bool_grid(state.rows, state.cols);
    let mut rooms = Vec::new();
    for row in 0..state.rows {
        for col in 0..state.cols {
            if visited[row][col] {
                continue;
            }
            let mut room = Vec::new();
            let mut queue = VecDeque::new();
            visited[row][col] = true;
            queue.push_back((row, col));
            while let Some((current_row, current_col)) = queue.pop_front() {
                room.push(current_row * state.cols + current_col);
                let neighbors = [
                    current_row.checked_sub(1).map(|r| (r, current_col, current_row - 1, current_col, true)),
                    (current_row + 1 < state.rows).then_some((current_row + 1, current_col, current_row, current_col, true)),
                    current_col.checked_sub(1).map(|c| (current_row, c, current_row, current_col - 1, false)),
                    (current_col + 1 < state.cols).then_some((current_row, current_col + 1, current_row, current_col, false)),
                ];
                for (next_row, next_col, boundary_row, boundary_col, horizontal) in neighbors.into_iter().flatten() {
                    if visited[next_row][next_col] {
                        continue;
                    }
                    let blocked = if horizontal {
                        state.h_boundaries[boundary_row][boundary_col]
                    } else {
                        state.v_boundaries[boundary_row][boundary_col]
                    };
                    if blocked {
                        continue;
                    }
                    visited[next_row][next_col] = true;
                    queue.push_back((next_row, next_col));
                }
            }
            rooms.push(room);
        }
    }
    rooms
}

struct RippleSolveResult {
    solutions: Vec<Vec<Vec<usize>>>,
    timed_out: bool,
}

fn solve_ripple(
    rows: usize,
    cols: usize,
    rooms: &[Vec<usize>],
    clues: &[Vec<Option<usize>>],
) -> RippleSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let total = rows * cols;
    let mut max_value = vec![0usize; total];
    let mut peer_of = vec![Vec::<usize>::new(); total];
    for room in rooms {
        for position in room {
            max_value[*position] = room.len();
            peer_of[*position] = room
                .iter()
                .copied()
                .filter(|peer| peer != position)
                .collect();
        }
    }

    let mut grid = vec![0usize; total];
    for row in 0..rows {
        for col in 0..cols {
            if let Some(value) = clues[row][col] {
                let index = row * cols + col;
                if value == 0 || value > max_value[index] {
                    return RippleSolveResult {
                        solutions: Vec::new(),
                        timed_out: false,
                    };
                }
                grid[index] = value;
            }
        }
    }

    for index in 0..total {
        if grid[index] != 0 {
            let value = grid[index];
            grid[index] = 0;
            if !ripple_value_ok(rows, cols, &grid, &peer_of, index, value) {
                return RippleSolveResult {
                    solutions: Vec::new(),
                    timed_out: false,
                };
            }
            grid[index] = value;
        }
    }

    let mut order = (0..total)
        .filter(|index| grid[*index] == 0)
        .collect::<Vec<_>>();
    order.sort_by_key(|index| max_value[*index]);

    let mut result = RippleSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    let started = js_sys::Date::now();
    ripple_dfs(
        0,
        rows,
        cols,
        &order,
        &max_value,
        &peer_of,
        &mut grid,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn ripple_dfs(
    order_index: usize,
    rows: usize,
    cols: usize,
    order: &[usize],
    max_value: &[usize],
    peer_of: &[Vec<usize>],
    grid: &mut [usize],
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut RippleSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    if order_index >= order.len() {
        let mut solution = vec![vec![0usize; cols]; rows];
        for row in 0..rows {
            for col in 0..cols {
                solution[row][col] = grid[row * cols + col];
            }
        }
        result.solutions.push(solution);
        return;
    }

    let position = order[order_index];
    for value in 1..=max_value[position] {
        if ripple_value_ok(rows, cols, grid, peer_of, position, value) {
            grid[position] = value;
            ripple_dfs(
                order_index + 1,
                rows,
                cols,
                order,
                max_value,
                peer_of,
                grid,
                steps,
                started,
                time_limit_ms,
                max_solutions,
                result,
            );
            grid[position] = 0;
            if result.timed_out || result.solutions.len() >= max_solutions {
                return;
            }
        }
    }
}

fn ripple_value_ok(
    rows: usize,
    cols: usize,
    grid: &[usize],
    peer_of: &[Vec<usize>],
    position: usize,
    value: usize,
) -> bool {
    for peer in &peer_of[position] {
        if grid[*peer] == value {
            return false;
        }
    }
    let row = position / cols;
    let col = position % cols;
    let start_col = col.saturating_sub(value);
    let end_col = (col + value).min(cols - 1);
    for current_col in start_col..=end_col {
        if current_col != col && grid[row * cols + current_col] == value {
            return false;
        }
    }
    let start_row = row.saturating_sub(value);
    let end_row = (row + value).min(rows - 1);
    for current_row in start_row..=end_row {
        if current_row != row && grid[current_row * cols + col] == value {
            return false;
        }
    }
    true
}

fn read_ripple_dimensions() -> (usize, usize) {
    let rows = read_usize_input("rip-rows", 6).clamp(2, 12);
    let cols = read_usize_input("rip-cols", 6).clamp(2, 12);
    set_input_value("rip-rows", &rows.to_string());
    set_input_value("rip-cols", &cols.to_string());
    (rows, cols)
}

fn set_ripple_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("rip-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("rip-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_ripple_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("rip-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn set_ripple_mode_button(mode: RippleMode) {
    if let Ok(document) = document() {
        if let Some(tag) = document
            .get_element_by_id("rip-mode-btn")
            .and_then(|button| button.query_selector(".cyber-button__tag").ok().flatten())
        {
            tag.set_text_content(Some(if mode == RippleMode::Boundary {
                "模式: 调整边界"
            } else {
                "模式: 输入数字"
            }));
        }
    }
}

fn ripple_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initRippleGrid && window.initRippleGrid()", "", false),
        ("计算核心分析", "window.solveRippleUI && window.solveRippleUI()", "rip-solve-btn", true),
        ("清空填涂", "window.clearRippleGrid && window.clearRippleGrid()", "", false),
        (
            "简单示例",
            "window.buildSimpleRippleExample && window.buildSimpleRippleExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_tents_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("tents-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("tents-workspace"),
        logic_title("TENTS", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "tnt-rows",
            "tnt-cols",
            &object_with_pairs(&[
                ("rowVal", "8"),
                ("colVal", "8"),
                ("rowMin", "3"),
                ("colMin", "3"),
                ("rowMax", "12"),
                ("colMax", "12")
            ])
        ),
        logic_action_grid4(&tents_action_buttons()),
        logic_stats_panel("tnt", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("tnt", "showTentsSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "点击格子放置/移除树木",
                "顶部输入每列帐篷数，左侧输入每行帐篷数",
                "每棵树恰好对应一个帐篷 (上下左右相邻)",
                "帐篷之间不能相邻 (含对角线)",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "tents-workspace",
        "tents-layout",
        &left,
        "<div id=\"tnt-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none\"></div>",
        Some(
            "#tnt-grid-container{gap:0}
        .tnt-clue{width:42px;height:42px;display:flex;justify-content:center;align-items:center;font-weight:700;color:var(--neon-cyan,#00ffe7)}
        .tnt-clue input{width:100%;height:100%;border:0;background:transparent;color:var(--neon-cyan,#00ffe7);text-align:center;font-size:1rem;font-weight:700;outline:0;padding:0;margin:0}
        .tnt-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.5rem;display:flex;justify-content:center;align-items:center;cursor:pointer;user-select:none;transition:background .15s}
        .tnt-cell:hover{background:rgba(0,255,231,.08)}
        .tnt-cell.tree::after{content:'\\1F332';text-shadow:0 0 8px rgba(105,240,174,.7)}
        .tnt-cell.tent::after{content:'\\26FA';text-shadow:0 0 8px rgba(0,255,100,.7);animation:tntPop .5s ease}
        .tnt-cell.tent{background:rgba(0,255,100,.12);border-color:rgba(0,255,100,.3)}
        .tnt-corner{width:42px;height:42px}
        @keyframes tntPop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_tents_globals()?;
    Ok(())
}

fn install_tents_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_tents_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initTentsGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_tents_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearTentsGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_tents_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleTentsExample"),
        example.as_ref(),
    )?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_tents_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveTentsPuzzleUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_tents_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showTentsSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn init_tents_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_tents_dimensions();
    TENTS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.grid = vec![vec![0; cols]; rows];
        state.row_clues = vec![None; rows];
        state.col_clues = vec![None; cols];
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tents_stats("-", "-");
    set_tents_nav(false);
    render_tents_grid()
}

fn clear_tents_grid() -> Result<(), JsValue> {
    TENTS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rows = state.rows;
        let cols = state.cols;
        state.grid = vec![vec![0; cols]; rows];
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tents_stats("-", "-");
    set_tents_nav(false);
    render_tents_grid()
}

fn build_simple_tents_example() -> Result<(), JsValue> {
    set_input_value("tnt-rows", "5");
    set_input_value("tnt-cols", "5");
    TENTS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 5;
        state.cols = 5;
        state.grid = vec![vec![0; 5]; 5];
        state.grid[0][0] = 1;
        state.grid[1][2] = 1;
        state.grid[3][1] = 1;
        state.row_clues = vec![Some(1), Some(1), Some(0), Some(1), Some(0)];
        state.col_clues = vec![Some(1), Some(1), Some(0), Some(1), Some(0)];
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tents_stats("-", "-");
    set_tents_nav(false);
    render_tents_grid()
}

fn solve_tents_puzzle_ui() -> Result<(), JsValue> {
    sync_tents_clues_from_inputs();
    let snapshot = TENTS_STATE.with(|state| state.borrow().clone());
    if !snapshot.grid.iter().flatten().any(|value| *value == 1) {
        set_tents_stats("请先放置树木", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_tents(
        snapshot.rows,
        snapshot.cols,
        &snapshot.grid,
        &snapshot.row_clues,
        &snapshot.col_clues,
    );
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    TENTS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_tents_stats(&count_text, &elapsed);
    set_tents_nav(has_solution);
    if has_solution {
        show_tents_solution(0)
    } else {
        render_tents_grid()
    }
}

fn show_tents_solution(delta: isize) -> Result<(), JsValue> {
    TENTS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = TENTS_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("tnt-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_tents_grid()
}

fn render_tents_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("tnt-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = TENTS_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("42px repeat({},42px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("42px repeat({},42px)", state.rows))?;

    let corner = document.create_element("div")?;
    corner.set_class_name("tnt-corner");
    container.append_child(&corner)?;

    for col in 0..state.cols {
        let clue = document.create_element("div")?;
        clue.set_class_name("tnt-clue");
        let input = tents_clue_input(true, col, state.col_clues[col])?;
        clue.append_child(input.as_ref())?;
        container.append_child(&clue)?;
    }

    for row in 0..state.rows {
        let clue = document.create_element("div")?;
        clue.set_class_name("tnt-clue");
        let input = tents_clue_input(false, row, state.row_clues[row])?;
        clue.append_child(input.as_ref())?;
        container.append_child(&clue)?;

        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("tnt-cell");
            let solution_value = if state.showing_solution {
                state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row).and_then(|items| items.get(col)))
                    .copied()
                    .unwrap_or(state.grid[row][col])
            } else {
                state.grid[row][col]
            };
            if solution_value == 1 || state.grid[row][col] == 1 {
                cell.class_list().add_1("tree")?;
            }
            if solution_value == 2 {
                cell.class_list().add_1("tent")?;
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let changed = TENTS_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.showing_solution || row >= state.rows || col >= state.cols {
                        return false;
                    }
                    state.grid[row][col] ^= 1;
                    state.solutions.clear();
                    state.solution_index = 0;
                    true
                });
                if changed {
                    set_tents_nav(false);
                    set_tents_stats("-", "-");
                    if let Err(err) = render_tents_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            container.append_child(&cell)?;
        }
    }
    Ok(())
}

fn tents_clue_input(is_col: bool, index: usize, value: Option<usize>) -> Result<HtmlInputElement, JsValue> {
    let input = document()?.create_element("input")?.dyn_into::<HtmlInputElement>()?;
    input.set_type("text");
    input.set_input_mode("numeric");
    input.set_id(&format!(
        "tnt-{}-clue-{index}",
        if is_col { "col" } else { "row" }
    ));
    input.set_attribute("maxlength", "2")?;
    input.set_placeholder("#");
    if let Some(value) = value {
        input.set_value(&value.to_string());
    }
    let change = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        let value = event
            .target()
            .and_then(|target| target.dyn_into::<HtmlInputElement>().ok())
            .map(|input| input.value())
            .unwrap_or_default();
        let parsed = value
            .trim()
            .parse::<usize>()
            .ok();
        TENTS_STATE.with(|state| {
            let mut state = state.borrow_mut();
            if is_col {
                if index < state.col_clues.len() {
                    state.col_clues[index] = parsed;
                }
            } else if index < state.row_clues.len() {
                state.row_clues[index] = parsed;
            }
            state.solutions.clear();
            state.solution_index = 0;
            state.showing_solution = false;
        });
        set_tents_nav(false);
        set_tents_stats("-", "-");
    }));
    input.add_event_listener_with_callback("input", change.as_ref().unchecked_ref())?;
    change.forget();
    Ok(input)
}

struct TentsSolveResult {
    solutions: Vec<Vec<Vec<u8>>>,
    timed_out: bool,
}

fn solve_tents(
    rows: usize,
    cols: usize,
    source_grid: &[Vec<u8>],
    row_clues: &[Option<usize>],
    col_clues: &[Option<usize>],
) -> TentsSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let total = rows * cols;
    let mut board = vec![0u8; total];
    let mut trees = Vec::new();
    for row in 0..rows {
        for col in 0..cols {
            let value = source_grid[row][col];
            board[row * cols + col] = value;
            if value == 1 {
                trees.push(row * cols + col);
            }
        }
    }

    let candidates = trees
        .iter()
        .map(|position| tents_candidates_for_tree(rows, cols, &board, *position))
        .collect::<Vec<_>>();
    let mut order = (0..trees.len()).collect::<Vec<_>>();
    order.sort_by_key(|index| candidates[*index].len());

    let mut result = TentsSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    let started = js_sys::Date::now();
    tents_dfs(
        0,
        rows,
        cols,
        &candidates,
        &order,
        row_clues,
        col_clues,
        &mut board,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn tents_dfs(
    order_index: usize,
    rows: usize,
    cols: usize,
    candidates: &[Vec<usize>],
    order: &[usize],
    row_clues: &[Option<usize>],
    col_clues: &[Option<usize>],
    board: &mut [u8],
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut TentsSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    if order_index >= order.len() {
        for row in 0..rows {
            if let Some(clue) = row_clues.get(row).copied().flatten() {
                if tents_count_axis(false, row, rows, cols, board) != clue {
                    return;
                }
            }
        }
        for col in 0..cols {
            if let Some(clue) = col_clues.get(col).copied().flatten() {
                if tents_count_axis(true, col, rows, cols, board) != clue {
                    return;
                }
            }
        }
        let mut solution = vec![vec![0u8; cols]; rows];
        for row in 0..rows {
            for col in 0..cols {
                solution[row][col] = board[row * cols + col];
            }
        }
        result.solutions.push(solution);
        return;
    }

    for position in &candidates[order[order_index]] {
        if board[*position] != 0 || !tents_position_ok(rows, cols, board, *position) {
            continue;
        }
        let row = position / cols;
        let col = position % cols;
        if let Some(clue) = row_clues.get(row).copied().flatten() {
            if tents_count_axis(false, row, rows, cols, board) + 1 > clue {
                continue;
            }
        }
        if let Some(clue) = col_clues.get(col).copied().flatten() {
            if tents_count_axis(true, col, rows, cols, board) + 1 > clue {
                continue;
            }
        }
        board[*position] = 2;
        tents_dfs(
            order_index + 1,
            rows,
            cols,
            candidates,
            order,
            row_clues,
            col_clues,
            board,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
        board[*position] = 0;
        if result.timed_out || result.solutions.len() >= max_solutions {
            return;
        }
    }
}

fn tents_candidates_for_tree(rows: usize, cols: usize, board: &[u8], position: usize) -> Vec<usize> {
    let row = position / cols;
    let col = position % cols;
    let mut candidates = Vec::new();
    for (delta_row, delta_col) in [(-1isize, 0isize), (1, 0), (0, -1), (0, 1)] {
        let next_row = row as isize + delta_row;
        let next_col = col as isize + delta_col;
        if next_row < 0 || next_row >= rows as isize || next_col < 0 || next_col >= cols as isize {
            continue;
        }
        let index = next_row as usize * cols + next_col as usize;
        if board[index] == 0 {
            candidates.push(index);
        }
    }
    candidates
}

fn tents_position_ok(rows: usize, cols: usize, board: &[u8], position: usize) -> bool {
    let row = position / cols;
    let col = position % cols;
    for delta_row in -1isize..=1 {
        for delta_col in -1isize..=1 {
            if delta_row == 0 && delta_col == 0 {
                continue;
            }
            let next_row = row as isize + delta_row;
            let next_col = col as isize + delta_col;
            if next_row < 0 || next_row >= rows as isize || next_col < 0 || next_col >= cols as isize {
                continue;
            }
            if board[next_row as usize * cols + next_col as usize] == 2 {
                return false;
            }
        }
    }
    true
}

fn tents_count_axis(is_col: bool, index: usize, rows: usize, cols: usize, board: &[u8]) -> usize {
    let mut count = 0usize;
    let limit = if is_col { rows } else { cols };
    for offset in 0..limit {
        let position = if is_col {
            offset * cols + index
        } else {
            index * cols + offset
        };
        if board[position] == 2 {
            count += 1;
        }
    }
    count
}

fn sync_tents_clues_from_inputs() {
    let Ok(document) = document() else {
        return;
    };
    TENTS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        for row in 0..state.rows {
            let id = format!("tnt-row-clue-{row}");
            state.row_clues[row] = document
                .get_element_by_id(&id)
                .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
                .and_then(|input| input.value().trim().parse::<usize>().ok());
        }
        for col in 0..state.cols {
            let id = format!("tnt-col-clue-{col}");
            state.col_clues[col] = document
                .get_element_by_id(&id)
                .and_then(|element| element.dyn_into::<HtmlInputElement>().ok())
                .and_then(|input| input.value().trim().parse::<usize>().ok());
        }
    });
}

fn read_tents_dimensions() -> (usize, usize) {
    let rows = read_usize_input("tnt-rows", 8).clamp(3, 12);
    let cols = read_usize_input("tnt-cols", 8).clamp(3, 12);
    set_input_value("tnt-rows", &rows.to_string());
    set_input_value("tnt-cols", &cols.to_string());
    (rows, cols)
}

fn set_tents_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("tnt-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("tnt-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_tents_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("tnt-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn tents_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initTentsGrid && window.initTentsGrid()", "", false),
        (
            "计算核心分析",
            "window.solveTentsPuzzleUI && window.solveTentsPuzzleUI()",
            "tnt-solve-btn",
            true,
        ),
        ("清空填涂", "window.clearTentsGrid && window.clearTentsGrid()", "", false),
        (
            "简单示例",
            "window.buildSimpleTentsExample && window.buildSimpleTentsExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_skyscrapers_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("skyscrapers-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("skyscrapers-workspace"),
        logic_title("SKYSCRAPERS", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_single_size_input(
            "sky-size",
            &object_with_pairs(&[("val", "4"), ("min", "3"), ("max", "9"), ("placeholder", "尺寸 N")])
        ),
        logic_action_grid4(&skyscrapers_action_buttons()),
        logic_stats_panel("sky", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("sky", "showSkyscrapersSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "在 N×N 网格中填入 1~N，每行每列不重复",
                "外围线索 = 从该方向能看到几栋摩天楼",
                "点击格子后用数字面板或键盘输入，尺寸 3~9",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "skyscrapers-workspace",
        "skyscrapers-layout",
        &left,
        "<div id=\"sky-grid-container\"></div><div id=\"sky-numpad\" class=\"sky-np\"></div>",
        Some(
            "#sky-grid-container{display:inline-grid;gap:0;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none}
        .sky-cell{width:42px;height:42px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;font-weight:700;cursor:pointer;border-radius:3px;transition:all .2s}
        .sky-cell.corner{visibility:hidden;cursor:default}
        .sky-cell.clue-cell{background:transparent;color:var(--hologram-purple,#b388ff);text-shadow:0 0 5px rgba(179,136,255,.5)}
        .sky-cell.clue-cell:hover{background:rgba(179,136,255,.1)}
        .sky-cell.inner-cell{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--neon-cyan,#00ffe7)}
        .sky-cell.inner-cell:hover{background:rgba(0,255,231,.08)}
        .sky-cell.active{background:rgba(0,243,255,.15)!important;border:1px solid var(--neon-cyan)!important;box-shadow:0 0 10px rgba(0,243,255,.2)}
        .sky-cell.fixed{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .sky-cell.solved{color:#0f0;text-shadow:0 0 8px rgba(0,255,0,.5)}
        .sky-np{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-top:10px}
        .sky-np button{padding:6px 12px;min-width:36px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#fff;cursor:pointer;border-radius:6px;transition:background .2s}
        .sky-np button:hover{background:rgba(255,255,255,.15);border-color:var(--neon-cyan)}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_skyscrapers_globals()?;
    install_skyscrapers_keydown()?;
    Ok(())
}

fn install_skyscrapers_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_skyscrapers_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initSkyscrapersGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_skyscrapers_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearSkyscrapersGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_skyscrapers_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleSkyscrapersExample"),
        example.as_ref(),
    )?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_skyscrapers_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveSkyscrapersUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_skyscrapers_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("showSkyscrapersSolution"),
        show.as_ref(),
    )?;
    show.forget();
    Ok(())
}

fn install_skyscrapers_keydown() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(document.as_ref(), &JsValue::from_str("__rustSkyscrapersKeyReady"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustSkyscrapersKeyReady"),
        &JsValue::TRUE,
    )?;
    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        let target = event
            .target()
            .map(JsValue::from)
            .unwrap_or(JsValue::NULL);
        if !logic_is_workspace_visible("skyscrapers-workspace") || logic_is_typing_target(&target) {
            return;
        }
        let key = event.key();
        if key.len() == 1 {
            if let Ok(value) = key.parse::<usize>() {
                if let Err(err) = set_skyscrapers_selected_value((value > 0).then_some(value)) {
                    console::error_1(&err);
                }
            }
        } else if key == "Backspace" || key == "Delete" {
            if let Err(err) = set_skyscrapers_selected_value(None) {
                console::error_1(&err);
            }
        } else if key == "c" || key == "C" {
            if let Err(err) = set_skyscrapers_selected_value(None) {
                console::error_1(&err);
            }
        } else if key.starts_with("Arrow") {
            event.prevent_default();
            if let Err(err) = move_skyscrapers_selection(&key) {
                console::error_1(&err);
            }
        }
    }));
    document.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
    keydown.forget();
    Ok(())
}

fn init_skyscrapers_grid() -> Result<(), JsValue> {
    let size = read_skyscrapers_size();
    SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.size = size;
        state.values = vec![vec![None; size + 2]; size + 2];
        state.selected = None;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_skyscrapers_stats("-", "-");
    set_skyscrapers_nav(false);
    render_skyscrapers_grid()
}

fn clear_skyscrapers_grid() -> Result<(), JsValue> {
    SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let size = state.size;
        state.values = vec![vec![None; size + 2]; size + 2];
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_skyscrapers_stats("-", "-");
    set_skyscrapers_nav(false);
    render_skyscrapers_grid()
}

fn build_simple_skyscrapers_example() -> Result<(), JsValue> {
    set_input_value("sky-size", "4");
    SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.size = 4;
        state.values = vec![vec![None; 6]; 6];
        state.selected = None;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
        for (col, value) in [3, 2, 1, 2].into_iter().enumerate() {
            state.values[0][col + 1] = Some(value);
        }
        for (col, value) in [2, 3, 2, 1].into_iter().enumerate() {
            state.values[5][col + 1] = Some(value);
        }
        for (row, value) in [2, 2, 1, 4].into_iter().enumerate() {
            state.values[row + 1][0] = Some(value);
        }
        for (row, value) in [2, 2, 4, 1].into_iter().enumerate() {
            state.values[row + 1][5] = Some(value);
        }
    });
    set_skyscrapers_stats("-", "-");
    set_skyscrapers_nav(false);
    render_skyscrapers_grid()
}

fn solve_skyscrapers_ui() -> Result<(), JsValue> {
    let snapshot = SKYSCRAPERS_STATE.with(|state| state.borrow().clone());
    let started = js_sys::Date::now();
    let result = solve_skyscrapers(&snapshot);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_skyscrapers_stats(&count_text, &elapsed);
    set_skyscrapers_nav(has_solution);
    if has_solution {
        show_skyscrapers_solution(0)
    } else {
        render_skyscrapers_grid()
    }
}

fn show_skyscrapers_solution(delta: isize) -> Result<(), JsValue> {
    SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = SKYSCRAPERS_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("sky-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_skyscrapers_grid()
}

fn render_skyscrapers_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("sky-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = SKYSCRAPERS_STATE.with(|state| state.borrow().clone());
    let total = state.size + 2;
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({total},42px)"))?;
    style.set_property("grid-template-rows", &format!("repeat({total},42px)"))?;

    for row in 0..total {
        for col in 0..total {
            let cell = document.create_element("div")?;
            cell.set_class_name("sky-cell");
            let kind = skyscrapers_cell_kind(state.size, row, col);
            match kind {
                SkyscrapersCellKind::Corner => {
                    cell.class_list().add_1("corner")?;
                }
                SkyscrapersCellKind::Clue => {
                    cell.class_list().add_1("clue-cell")?;
                }
                SkyscrapersCellKind::Inner => {
                    cell.class_list().add_1("inner-cell")?;
                }
            }
            if state.selected == Some((row, col)) {
                cell.class_list().add_1("active")?;
            }
            let display_value = if kind == SkyscrapersCellKind::Inner && state.showing_solution {
                state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row - 1).and_then(|items| items.get(col - 1)))
                    .copied()
            } else {
                state.values[row][col]
            };
            if let Some(value) = display_value {
                cell.set_text_content(Some(&value.to_string()));
                if state.values[row][col].is_some() {
                    cell.class_list().add_1("fixed")?;
                } else if state.showing_solution && kind == SkyscrapersCellKind::Inner {
                    cell.class_list().add_1("solved")?;
                }
            }
            if kind != SkyscrapersCellKind::Corner {
                let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                    event.prevent_default();
                    SKYSCRAPERS_STATE.with(|state| {
                        let mut state = state.borrow_mut();
                        state.selected = Some((row, col));
                    });
                    if let Err(err) = render_skyscrapers_grid() {
                        console::error_1(&err);
                    }
                }));
                cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
                click.forget();
            }
            container.append_child(&cell)?;
        }
    }
    render_skyscrapers_numpad()
}

fn render_skyscrapers_numpad() -> Result<(), JsValue> {
    let document = document()?;
    let Some(numpad) = document.get_element_by_id("sky-numpad") else {
        return Ok(());
    };
    numpad.set_inner_html("");
    let size = SKYSCRAPERS_STATE.with(|state| state.borrow().size);
    for value in 1..=size {
        let button = document.create_element("button")?;
        button.set_text_content(Some(&value.to_string()));
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            if let Err(err) = set_skyscrapers_selected_value(Some(value)) {
                console::error_1(&err);
            }
        }));
        button.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
        numpad.append_child(&button)?;
    }
    let clear = document.create_element("button")?;
    clear.set_text_content(Some("C"));
    let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        event.prevent_default();
        if let Err(err) = set_skyscrapers_selected_value(None) {
            console::error_1(&err);
        }
    }));
    clear.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
    click.forget();
    numpad.append_child(&clear)?;
    Ok(())
}

fn set_skyscrapers_selected_value(value: Option<usize>) -> Result<(), JsValue> {
    let changed = SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let Some((row, col)) = state.selected else {
            return false;
        };
        if skyscrapers_cell_kind(state.size, row, col) == SkyscrapersCellKind::Corner || state.showing_solution {
            return false;
        }
        if let Some(value) = value {
            if value > state.size {
                return false;
            }
            state.values[row][col] = Some(value);
        } else {
            state.values[row][col] = None;
        }
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
        true
    });
    if changed {
        set_skyscrapers_stats("-", "-");
        set_skyscrapers_nav(false);
        render_skyscrapers_grid()?;
    }
    Ok(())
}

fn move_skyscrapers_selection(key: &str) -> Result<(), JsValue> {
    SKYSCRAPERS_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let Some((mut row, mut col)) = state.selected else {
            return;
        };
        match key {
            "ArrowUp" => row = row.saturating_sub(1),
            "ArrowDown" => row = (row + 1).min(state.size + 1),
            "ArrowLeft" => col = col.saturating_sub(1),
            "ArrowRight" => col = (col + 1).min(state.size + 1),
            _ => {}
        }
        if skyscrapers_cell_kind(state.size, row, col) != SkyscrapersCellKind::Corner {
            state.selected = Some((row, col));
        }
    });
    render_skyscrapers_grid()
}

struct SkyscrapersSolveResult {
    solutions: Vec<Vec<Vec<usize>>>,
    timed_out: bool,
}

fn solve_skyscrapers(state: &SkyscrapersState) -> SkyscrapersSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let size = state.size;
    let mut grid = vec![0usize; size * size];
    for row in 0..size {
        for col in 0..size {
            if let Some(value) = state.values[row + 1][col + 1] {
                if value == 0 || value > size {
                    return SkyscrapersSolveResult {
                        solutions: Vec::new(),
                        timed_out: false,
                    };
                }
                grid[row * size + col] = value;
            }
        }
    }

    for index in 0..size * size {
        if grid[index] != 0 {
            let value = grid[index];
            grid[index] = 0;
            if !skyscrapers_value_ok(size, &grid, index / size, index % size, value) {
                return SkyscrapersSolveResult {
                    solutions: Vec::new(),
                    timed_out: false,
                };
            }
            grid[index] = value;
        }
    }

    let order = (0..size * size)
        .filter(|index| grid[*index] == 0)
        .collect::<Vec<_>>();
    let mut result = SkyscrapersSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    let started = js_sys::Date::now();
    skyscrapers_dfs(
        0,
        size,
        &state.values,
        &order,
        &mut grid,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn skyscrapers_dfs(
    order_index: usize,
    size: usize,
    values: &[Vec<Option<usize>>],
    order: &[usize],
    grid: &mut [usize],
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut SkyscrapersSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    if order_index >= order.len() {
        let mut solution = vec![vec![0usize; size]; size];
        for row in 0..size {
            for col in 0..size {
                solution[row][col] = grid[row * size + col];
            }
        }
        result.solutions.push(solution);
        return;
    }

    let position = order[order_index];
    let row = position / size;
    let col = position % size;
    for value in 1..=size {
        if skyscrapers_value_ok(size, grid, row, col, value) {
            grid[position] = value;
            if skyscrapers_partial_ok(size, values, grid, row, col) {
                skyscrapers_dfs(
                    order_index + 1,
                    size,
                    values,
                    order,
                    grid,
                    steps,
                    started,
                    time_limit_ms,
                    max_solutions,
                    result,
                );
            }
            grid[position] = 0;
            if result.timed_out || result.solutions.len() >= max_solutions {
                return;
            }
        }
    }
}

fn skyscrapers_value_ok(size: usize, grid: &[usize], row: usize, col: usize, value: usize) -> bool {
    for current_col in 0..size {
        if grid[row * size + current_col] == value {
            return false;
        }
    }
    for current_row in 0..size {
        if grid[current_row * size + col] == value {
            return false;
        }
    }
    true
}

fn skyscrapers_partial_ok(
    size: usize,
    values: &[Vec<Option<usize>>],
    grid: &[usize],
    row: usize,
    col: usize,
) -> bool {
    let mut row_values = vec![0usize; size];
    let mut row_full = true;
    for current_col in 0..size {
        let value = grid[row * size + current_col];
        row_values[current_col] = value;
        if value == 0 {
            row_full = false;
        }
    }
    if row_full {
        if !skyscrapers_clue_matches(values[row + 1][0], skyscrapers_visible(&row_values))
            || !skyscrapers_clue_matches(values[row + 1][size + 1], skyscrapers_visible_reverse(&row_values))
        {
            return false;
        }
    } else if skyscrapers_clue_exceeded(values[row + 1][0], skyscrapers_visible(&row_values[..=col])) {
        return false;
    }

    let mut col_values = vec![0usize; size];
    let mut col_full = true;
    for current_row in 0..size {
        let value = grid[current_row * size + col];
        col_values[current_row] = value;
        if value == 0 {
            col_full = false;
        }
    }
    if col_full {
        if !skyscrapers_clue_matches(values[0][col + 1], skyscrapers_visible(&col_values))
            || !skyscrapers_clue_matches(values[size + 1][col + 1], skyscrapers_visible_reverse(&col_values))
        {
            return false;
        }
    } else if skyscrapers_clue_exceeded(values[0][col + 1], skyscrapers_visible(&col_values[..=row])) {
        return false;
    }
    true
}

fn skyscrapers_visible(values: &[usize]) -> usize {
    let mut max_seen = 0usize;
    let mut count = 0usize;
    for value in values {
        if *value > max_seen {
            max_seen = *value;
            count += 1;
        }
    }
    count
}

fn skyscrapers_visible_reverse(values: &[usize]) -> usize {
    let mut max_seen = 0usize;
    let mut count = 0usize;
    for value in values.iter().rev() {
        if *value > max_seen {
            max_seen = *value;
            count += 1;
        }
    }
    count
}

fn skyscrapers_clue_matches(clue: Option<usize>, value: usize) -> bool {
    clue.map(|clue| clue == value).unwrap_or(true)
}

fn skyscrapers_clue_exceeded(clue: Option<usize>, value: usize) -> bool {
    clue.map(|clue| value > clue).unwrap_or(false)
}

fn skyscrapers_cell_kind(size: usize, row: usize, col: usize) -> SkyscrapersCellKind {
    let total = size + 1;
    if row == 0 || row == total {
        if col > 0 && col < total {
            SkyscrapersCellKind::Clue
        } else {
            SkyscrapersCellKind::Corner
        }
    } else if col == 0 || col == total {
        if row > 0 && row < total {
            SkyscrapersCellKind::Clue
        } else {
            SkyscrapersCellKind::Corner
        }
    } else {
        SkyscrapersCellKind::Inner
    }
}

fn read_skyscrapers_size() -> usize {
    let size = read_usize_input("sky-size", 4).clamp(3, 9);
    set_input_value("sky-size", &size.to_string());
    size
}

fn set_skyscrapers_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("sky-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("sky-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_skyscrapers_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("sky-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn skyscrapers_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        (
            "重置网格",
            "window.initSkyscrapersGrid && window.initSkyscrapersGrid()",
            "",
            false,
        ),
        (
            "计算核心分析",
            "window.solveSkyscrapersUI && window.solveSkyscrapersUI()",
            "sky-solve-btn",
            true,
        ),
        (
            "清空填涂",
            "window.clearSkyscrapersGrid && window.clearSkyscrapersGrid()",
            "",
            false,
        ),
        (
            "简单示例",
            "window.buildSimpleSkyscrapersExample && window.buildSimpleSkyscrapersExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_tren_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("tren-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("tren-workspace"),
        logic_title("TREN", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "trn-rows",
            "trn-cols",
            &object_with_pairs(&[
                ("rowVal", "6"),
                ("colVal", "6"),
                ("rowMin", "3"),
                ("colMin", "3"),
                ("rowMax", "12"),
                ("colMax", "12")
            ])
        ),
        logic_action_grid4(&tren_action_buttons()),
        logic_stats_panel("trn", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("trn", "showTrenSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "点击格子输入数字线索（留空 = 空白格）",
                "放置 1×2 或 1×3 的车辆，车辆不能重叠",
                "数字 = 该车沿移动方向可滑动的总格数",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "tren-workspace",
        "tren-layout",
        &left,
        "<div id=\"tren-grid-container\"></div>",
        Some(
            "#tren-grid-container{display:inline-grid;gap:0;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);user-select:none}
        .trn-cell{width:44px;height:44px;display:flex;justify-content:center;align-items:center;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;transition:background .15s}
        .trn-cell:hover{background:rgba(0,255,231,.08)}
        .trn-cell.clue{color:#fff;font-weight:700;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .trn-cell.vehicle{background:rgba(64,224,255,.35);border-color:rgba(0,229,255,.5)}
        .trn-cell.vehicle.vt{border-top:2px solid var(--neon-cyan)}.trn-cell.vehicle.vb{border-bottom:2px solid var(--neon-cyan)}.trn-cell.vehicle.vl{border-left:2px solid var(--neon-cyan)}.trn-cell.vehicle.vr{border-right:2px solid var(--neon-cyan)}
        .trn-cell input.ti{width:100%;height:100%;border:0;background:transparent;color:var(--neon-cyan);text-align:center;font-size:1rem;font-weight:700;outline:0;padding:0;margin:0}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_tren_globals()?;
    Ok(())
}

fn install_tren_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_tren_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initTrenGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_tren_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearTrenGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_tren_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("buildSimpleTrenExample"), example.as_ref())?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_tren_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveTrenPuzzleUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_tren_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showTrenSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn init_tren_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_tren_dimensions();
    TREN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.clues = empty_option_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tren_stats("-", "-");
    set_tren_nav(false);
    render_tren_grid()
}

fn clear_tren_grid() -> Result<(), JsValue> {
    TREN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rows = state.rows;
        let cols = state.cols;
        state.clues = empty_option_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tren_stats("-", "-");
    set_tren_nav(false);
    render_tren_grid()
}

fn build_simple_tren_example() -> Result<(), JsValue> {
    set_input_value("trn-rows", "4");
    set_input_value("trn-cols", "4");
    TREN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 4;
        state.cols = 4;
        state.clues = empty_option_grid(4, 4);
        state.clues[0][0] = Some(2);
        state.clues[1][2] = Some(1);
        state.clues[3][0] = Some(2);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tren_stats("-", "-");
    set_tren_nav(false);
    render_tren_grid()
}

fn solve_tren_puzzle_ui() -> Result<(), JsValue> {
    let snapshot = TREN_STATE.with(|state| state.borrow().clone());
    if shikaku_clue_count(&snapshot.clues) == 0 {
        set_tren_stats("请先输入线索", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_tren(snapshot.rows, snapshot.cols, &snapshot.clues);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    TREN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_tren_stats(&count_text, &elapsed);
    set_tren_nav(has_solution);
    if has_solution {
        show_tren_solution(0)
    } else {
        render_tren_grid()
    }
}

fn show_tren_solution(delta: isize) -> Result<(), JsValue> {
    TREN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = TREN_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("trn-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_tren_grid()
}

fn render_tren_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("tren-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = TREN_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},44px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},44px)", state.rows))?;

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("trn-cell");
            cell.set_attribute("data-r", &row.to_string())?;
            cell.set_attribute("data-c", &col.to_string())?;
            if let Some(value) = state.clues[row][col] {
                cell.class_list().add_1("clue")?;
                cell.set_text_content(Some(&value.to_string()));
            }
            if state.showing_solution {
                if let Some(solution) = state.solutions.get(state.solution_index) {
                    let value = solution[row][col];
                    if value > 0 {
                        cell.class_list().add_1("vehicle")?;
                        apply_tren_vehicle_borders(&cell, solution, row, col)?;
                    }
                }
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                if let Err(err) = edit_tren_cell(row, col) {
                    console::error_1(&err);
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            container.append_child(&cell)?;
        }
    }
    Ok(())
}

fn edit_tren_cell(row: usize, col: usize) -> Result<(), JsValue> {
    let showing = TREN_STATE.with(|state| state.borrow().showing_solution);
    if showing {
        return Ok(());
    }
    let document = document()?;
    let Some(container) = document.get_element_by_id("tren-grid-container") else {
        return Ok(());
    };
    let selector = format!(".trn-cell[data-r=\"{row}\"][data-c=\"{col}\"]");
    let Some(cell) = container.query_selector(&selector)? else {
        return Ok(());
    };
    let current = TREN_STATE.with(|state| {
        state
            .borrow()
            .clues
            .get(row)
            .and_then(|items| items.get(col))
            .and_then(|value| *value)
    });
    cell.set_text_content(None);
    let input = document.create_element("input")?.dyn_into::<HtmlInputElement>()?;
    input.set_type("text");
    input.set_input_mode("numeric");
    input.set_class_name("ti");
    input.set_attribute("maxlength", "2")?;
    if let Some(value) = current {
        input.set_value(&value.to_string());
    }
    cell.append_child(input.as_ref())?;
    input.focus()?;

    let input_for_blur = input.clone();
    let blur = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        commit_tren_value(row, col, &input_for_blur.value());
        if let Err(err) = render_tren_grid() {
            console::error_1(&err);
        }
    }));
    input.add_event_listener_with_callback("blur", blur.as_ref().unchecked_ref())?;
    blur.forget();

    let input_for_key = input.clone();
    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        let key = event.key();
        if key == "Enter" {
            let _ = input_for_key.blur();
        } else if key == "Escape" || key == "Delete" || key == "Backspace" {
            input_for_key.set_value("");
            let _ = input_for_key.blur();
        }
    }));
    input.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
    keydown.forget();
    Ok(())
}

fn commit_tren_value(row: usize, col: usize, value: &str) {
    let parsed = value.trim().parse::<usize>().ok();
    TREN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if row >= state.rows || col >= state.cols {
            return;
        }
        state.clues[row][col] = parsed;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
}

fn apply_tren_vehicle_borders(
    cell: &Element,
    solution: &[Vec<usize>],
    row: usize,
    col: usize,
) -> Result<(), JsValue> {
    let rows = solution.len();
    let cols = solution.first().map(Vec::len).unwrap_or(0);
    let value = solution[row][col];
    if row == 0 || solution[row - 1][col] != value {
        cell.class_list().add_1("vt")?;
    }
    if row + 1 == rows || solution[row + 1][col] != value {
        cell.class_list().add_1("vb")?;
    }
    if col == 0 || solution[row][col - 1] != value {
        cell.class_list().add_1("vl")?;
    }
    if col + 1 == cols || solution[row][col + 1] != value {
        cell.class_list().add_1("vr")?;
    }
    Ok(())
}

#[derive(Clone, Copy)]
struct TrenVehicle {
    row: usize,
    col: usize,
    width: usize,
    height: usize,
}

struct TrenSolveResult {
    solutions: Vec<Vec<Vec<usize>>>,
    timed_out: bool,
}

fn solve_tren(rows: usize, cols: usize, clues: &[Vec<Option<usize>>]) -> TrenSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const TIME_LIMIT_MS: f64 = 4_000.0;

    let mut clue_values = vec![None; rows * cols];
    for row in 0..rows {
        for col in 0..cols {
            clue_values[row * cols + col] = clues[row][col];
        }
    }
    let mut board = vec![0isize; rows * cols];
    let mut result = TrenSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    let mut next_id = 1isize;
    let started = js_sys::Date::now();
    tren_dfs(
        0,
        rows,
        cols,
        &clue_values,
        &mut board,
        &mut next_id,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn tren_dfs(
    position: usize,
    rows: usize,
    cols: usize,
    clues: &[Option<usize>],
    board: &mut [isize],
    next_id: &mut isize,
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut TrenSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    let total = rows * cols;
    if position >= total {
        if tren_solution_ok(rows, cols, clues, board) {
            result.solutions.push(tren_snapshot(rows, cols, board));
        }
        return;
    }
    if board[position] != 0 {
        tren_dfs(
            position + 1,
            rows,
            cols,
            clues,
            board,
            next_id,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
        return;
    }

    if clues[position].is_none() {
        board[position] = -1;
        tren_dfs(
            position + 1,
            rows,
            cols,
            clues,
            board,
            next_id,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
        board[position] = 0;
        if result.timed_out || result.solutions.len() >= max_solutions {
            return;
        }
    }

    for (width, height) in [(1usize, 2usize), (1, 3), (2, 1), (3, 1)] {
        if !tren_can_place(position, rows, cols, board, width, height) {
            continue;
        }
        let id = *next_id;
        *next_id += 1;
        tren_fill(position, cols, board, width, height, id);
        tren_dfs(
            position + 1,
            rows,
            cols,
            clues,
            board,
            next_id,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
        tren_fill(position, cols, board, width, height, 0);
        *next_id -= 1;
        if result.timed_out || result.solutions.len() >= max_solutions {
            return;
        }
    }
}

fn tren_can_place(position: usize, rows: usize, cols: usize, board: &[isize], width: usize, height: usize) -> bool {
    let row = position / cols;
    let col = position % cols;
    if row + height > rows || col + width > cols {
        return false;
    }
    for delta_row in 0..height {
        for delta_col in 0..width {
            if board[(row + delta_row) * cols + col + delta_col] != 0 {
                return false;
            }
        }
    }
    true
}

fn tren_fill(position: usize, cols: usize, board: &mut [isize], width: usize, height: usize, value: isize) {
    let row = position / cols;
    let col = position % cols;
    for delta_row in 0..height {
        for delta_col in 0..width {
            board[(row + delta_row) * cols + col + delta_col] = value;
        }
    }
}

fn tren_solution_ok(rows: usize, cols: usize, clues: &[Option<usize>], board: &[isize]) -> bool {
    let vehicles = tren_vehicle_meta(rows, cols, board);
    for (index, clue) in clues.iter().enumerate() {
        let Some(clue) = clue else {
            continue;
        };
        let vehicle_id = board[index];
        if vehicle_id <= 0 {
            return false;
        }
        let Some(vehicle) = vehicles.iter().find(|(id, _)| *id == vehicle_id).map(|(_, vehicle)| *vehicle) else {
            return false;
        };
        if tren_freedom(rows, cols, board, vehicle) != *clue {
            return false;
        }
    }
    true
}

fn tren_vehicle_meta(rows: usize, cols: usize, board: &[isize]) -> Vec<(isize, TrenVehicle)> {
    let mut seen = HashSet::new();
    let mut vehicles = Vec::new();
    for index in 0..rows * cols {
        let id = board[index];
        if id <= 0 || seen.contains(&id) {
            continue;
        }
        seen.insert(id);
        let row = index / cols;
        let col = index % cols;
        let mut width = 1usize;
        while col + width < cols && board[row * cols + col + width] == id {
            width += 1;
        }
        let mut height = 1usize;
        while row + height < rows && board[(row + height) * cols + col] == id {
            height += 1;
        }
        vehicles.push((id, TrenVehicle { row, col, width, height }));
    }
    vehicles
}

fn tren_freedom(rows: usize, cols: usize, board: &[isize], vehicle: TrenVehicle) -> usize {
    let mut free = 0usize;
    if vehicle.width > vehicle.height {
        let row = vehicle.row;
        let mut col = vehicle.col;
        while col > 0 {
            col -= 1;
            if board[row * cols + col] > 0 {
                break;
            }
            free += 1;
        }
        let mut col = vehicle.col + vehicle.width;
        while col < cols {
            if board[row * cols + col] > 0 {
                break;
            }
            free += 1;
            col += 1;
        }
    } else {
        let col = vehicle.col;
        let mut row = vehicle.row;
        while row > 0 {
            row -= 1;
            if board[row * cols + col] > 0 {
                break;
            }
            free += 1;
        }
        let mut row = vehicle.row + vehicle.height;
        while row < rows {
            if board[row * cols + col] > 0 {
                break;
            }
            free += 1;
            row += 1;
        }
    }
    free
}

fn tren_snapshot(rows: usize, cols: usize, board: &[isize]) -> Vec<Vec<usize>> {
    let mut solution = vec![vec![0usize; cols]; rows];
    for row in 0..rows {
        for col in 0..cols {
            let value = board[row * cols + col];
            solution[row][col] = if value > 0 { value as usize } else { 0 };
        }
    }
    solution
}

fn read_tren_dimensions() -> (usize, usize) {
    let rows = read_usize_input("trn-rows", 6).clamp(3, 12);
    let cols = read_usize_input("trn-cols", 6).clamp(3, 12);
    set_input_value("trn-rows", &rows.to_string());
    set_input_value("trn-cols", &cols.to_string());
    (rows, cols)
}

fn set_tren_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("trn-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("trn-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_tren_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("trn-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn tren_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initTrenGrid && window.initTrenGrid()", "", false),
        (
            "计算核心分析",
            "window.solveTrenPuzzleUI && window.solveTrenPuzzleUI()",
            "trn-solve-btn",
            true,
        ),
        ("清空填涂", "window.clearTrenGrid && window.clearTrenGrid()", "", false),
        (
            "简单示例",
            "window.buildSimpleTrenExample && window.buildSimpleTrenExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_minesweeper_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("minesweeper-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("minesweeper-workspace"),
        logic_title("MINESWEEPER", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "ms-rows",
            "ms-cols",
            &object_with_pairs(&[
                ("rowVal", "5"),
                ("colVal", "5"),
                ("rowMin", "3"),
                ("colMin", "3"),
                ("rowMax", "12"),
                ("colMax", "12")
            ])
        ),
        logic_action_grid4(&minesweeper_action_buttons()),
        logic_stats_panel("ms", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("ms", "showMSSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "左键点击: 循环 空白 → 线索0 → 1 → ... → 8 → 空白",
                "右键点击: 反向循环 / 快速清除",
                "线索格 = 周围8格中的地雷数",
                "线索格本身不是地雷",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "minesweeper-workspace",
        "minesweeper-layout",
        &left,
        "<div id=\"ms-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;\"></div>",
        Some(
            "#ms-grid-container{gap:1px}
        .ms-cell{width:36px;height:36px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;cursor:pointer;font-weight:700;font-size:1rem;position:relative;user-select:none}
        .ms-cell:hover{background:rgba(0,255,231,.1)}
        .ms-cell.clue{background:rgba(0,50,80,.4)}
        .ms-cell.mine-sol{background:radial-gradient(circle,rgba(255,40,40,.25) 0%,rgba(0,0,0,.5) 70%);animation:ms-pulse 1.5s ease-in-out infinite}
        .ms-cell.mine-sol::after{content:'';width:12px;height:12px;background:#ff2828;transform:rotate(45deg);box-shadow:0 0 8px #ff2828,0 0 16px rgba(255,40,40,.5);border-radius:2px}
        .ms-cell.mine-sol::before{content:'';position:absolute;width:24px;height:24px;border:1px solid rgba(255,40,40,.3);border-radius:50%;animation:ms-ripple 2s ease-out infinite}
        @keyframes ms-pulse{0%,100%{opacity:.85}50%{opacity:1}}
        @keyframes ms-ripple{0%{transform:scale(.5);opacity:.6}100%{transform:scale(1.3);opacity:0}}
        .ms-cell.safe-sol{background:rgba(0,255,231,.06)}
        .ms-c0{color:rgba(255,255,255,.3)} .ms-c1{color:#0cf} .ms-c2{color:#0f0} .ms-c3{color:#f36}
        .ms-c4{color:#bc13fe} .ms-c5{color:#ff0} .ms-c6{color:#0ff} .ms-c7{color:#f90} .ms-c8{color:#f00}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_minesweeper_globals()?;
    Ok(())
}

fn install_minesweeper_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_minesweeper_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initMSGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_minesweeper_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearMSGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_minesweeper_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("buildSimpleMSExample"), example.as_ref())?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_minesweeper_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveMSPuzzleUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_minesweeper_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showMSSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn init_minesweeper_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_minesweeper_dimensions();
    MINESWEEPER_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.clues = empty_option_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_minesweeper_stats("-", "-");
    set_minesweeper_nav(false);
    render_minesweeper_grid()
}

fn clear_minesweeper_grid() -> Result<(), JsValue> {
    MINESWEEPER_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_minesweeper_stats("-", "-");
    set_minesweeper_nav(false);
    render_minesweeper_grid()
}

fn build_simple_minesweeper_example() -> Result<(), JsValue> {
    set_input_value("ms-rows", "5");
    set_input_value("ms-cols", "5");
    MINESWEEPER_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 5;
        state.cols = 5;
        state.clues = empty_option_grid(5, 5);
        for (row, col) in [(1usize, 1usize), (1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2), (3, 3)] {
            state.clues[row][col] = Some(1);
        }
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_minesweeper_stats("-", "-");
    set_minesweeper_nav(false);
    render_minesweeper_grid()
}

fn solve_minesweeper_puzzle_ui() -> Result<(), JsValue> {
    let snapshot = MINESWEEPER_STATE.with(|state| state.borrow().clone());
    let started = js_sys::Date::now();
    let result = solve_minesweeper(snapshot.rows, snapshot.cols, &snapshot.clues);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    MINESWEEPER_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_minesweeper_stats(&count_text, &elapsed);
    set_minesweeper_nav(has_solution);
    if has_solution {
        show_minesweeper_solution(0)
    } else {
        render_minesweeper_grid()
    }
}

fn show_minesweeper_solution(delta: isize) -> Result<(), JsValue> {
    MINESWEEPER_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = MINESWEEPER_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("ms-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_minesweeper_grid()
}

fn render_minesweeper_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("ms-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = MINESWEEPER_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},36px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},36px)", state.rows))?;

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("ms-cell");
            if let Some(value) = state.clues[row][col] {
                cell.class_list().add_2("clue", &format!("ms-c{value}"))?;
                cell.set_text_content(Some(&value.to_string()));
            }
            if state.showing_solution {
                let is_mine = state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row).and_then(|items| items.get(col)))
                    .copied()
                    .unwrap_or(false);
                if is_mine {
                    cell.class_list().add_1("mine-sol")?;
                } else if state.clues[row][col].is_none() {
                    cell.class_list().add_1("safe-sol")?;
                }
            }
            let left = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let changed = MINESWEEPER_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.showing_solution {
                        return false;
                    }
                    state.clues[row][col] = match state.clues[row][col] {
                        None => Some(0),
                        Some(value) if value < 8 => Some(value + 1),
                        Some(_) => None,
                    };
                    state.solutions.clear();
                    state.solution_index = 0;
                    true
                });
                if changed {
                    set_minesweeper_nav(false);
                    set_minesweeper_stats("-", "-");
                    if let Err(err) = render_minesweeper_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("click", left.as_ref().unchecked_ref())?;
            left.forget();

            let right = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let changed = MINESWEEPER_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.showing_solution {
                        return false;
                    }
                    state.clues[row][col] = match state.clues[row][col] {
                        Some(value) if value > 0 => Some(value - 1),
                        Some(_) => None,
                        None => Some(8),
                    };
                    state.solutions.clear();
                    state.solution_index = 0;
                    true
                });
                if changed {
                    set_minesweeper_nav(false);
                    set_minesweeper_stats("-", "-");
                    if let Err(err) = render_minesweeper_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("contextmenu", right.as_ref().unchecked_ref())?;
            right.forget();
            container.append_child(&cell)?;
        }
    }
    Ok(())
}

struct MinesweeperSolveResult {
    solutions: Vec<Vec<Vec<bool>>>,
    timed_out: bool,
}

fn solve_minesweeper(
    rows: usize,
    cols: usize,
    clues: &[Vec<Option<usize>>],
) -> MinesweeperSolveResult {
    const MAX_SOLUTIONS: usize = 100;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let mut board = vec![0i8; rows * cols];
    for row in 0..rows {
        for col in 0..cols {
            if clues[row][col].is_some() {
                board[row * cols + col] = -1;
            }
        }
    }
    let mut result = MinesweeperSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    let started = js_sys::Date::now();
    minesweeper_dfs(
        0,
        rows,
        cols,
        clues,
        &mut board,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn minesweeper_dfs(
    index: usize,
    rows: usize,
    cols: usize,
    clues: &[Vec<Option<usize>>],
    board: &mut [i8],
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut MinesweeperSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    if index == rows * cols {
        if minesweeper_final_ok(rows, cols, clues, board) {
            result.solutions.push(minesweeper_snapshot(rows, cols, board));
        }
        return;
    }
    if board[index] != 0 {
        if minesweeper_local_ok(rows, cols, clues, board, index) {
            minesweeper_dfs(
                index + 1,
                rows,
                cols,
                clues,
                board,
                steps,
                started,
                time_limit_ms,
                max_solutions,
                result,
            );
        }
        return;
    }

    board[index] = 1;
    if minesweeper_local_ok(rows, cols, clues, board, index) {
        minesweeper_dfs(
            index + 1,
            rows,
            cols,
            clues,
            board,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
    }
    if result.timed_out || result.solutions.len() >= max_solutions {
        board[index] = 0;
        return;
    }

    board[index] = -1;
    if minesweeper_local_ok(rows, cols, clues, board, index) {
        minesweeper_dfs(
            index + 1,
            rows,
            cols,
            clues,
            board,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
    }
    board[index] = 0;
}

fn minesweeper_local_ok(
    rows: usize,
    cols: usize,
    clues: &[Vec<Option<usize>>],
    board: &[i8],
    index: usize,
) -> bool {
    let row = index / cols;
    let col = index % cols;
    for clue_row in row.saturating_sub(1)..=(row + 1).min(rows - 1) {
        for clue_col in col.saturating_sub(1)..=(col + 1).min(cols - 1) {
            let Some(value) = clues[clue_row][clue_col] else {
                continue;
            };
            let (mines, unknown) = minesweeper_neighbor_counts(rows, cols, board, clue_row, clue_col);
            if mines > value || mines + unknown < value {
                return false;
            }
        }
    }
    true
}

fn minesweeper_final_ok(rows: usize, cols: usize, clues: &[Vec<Option<usize>>], board: &[i8]) -> bool {
    for row in 0..rows {
        for col in 0..cols {
            let Some(value) = clues[row][col] else {
                continue;
            };
            let (mines, _) = minesweeper_neighbor_counts(rows, cols, board, row, col);
            if mines != value {
                return false;
            }
        }
    }
    true
}

fn minesweeper_neighbor_counts(
    rows: usize,
    cols: usize,
    board: &[i8],
    row: usize,
    col: usize,
) -> (usize, usize) {
    let mut mines = 0usize;
    let mut unknown = 0usize;
    for next_row in row.saturating_sub(1)..=(row + 1).min(rows - 1) {
        for next_col in col.saturating_sub(1)..=(col + 1).min(cols - 1) {
            if next_row == row && next_col == col {
                continue;
            }
            match board[next_row * cols + next_col] {
                1 => mines += 1,
                0 => unknown += 1,
                _ => {}
            }
        }
    }
    (mines, unknown)
}

fn minesweeper_snapshot(rows: usize, cols: usize, board: &[i8]) -> Vec<Vec<bool>> {
    let mut solution = vec![vec![false; cols]; rows];
    for row in 0..rows {
        for col in 0..cols {
            solution[row][col] = board[row * cols + col] == 1;
        }
    }
    solution
}

fn read_minesweeper_dimensions() -> (usize, usize) {
    let rows = read_usize_input("ms-rows", 5).clamp(3, 12);
    let cols = read_usize_input("ms-cols", 5).clamp(3, 12);
    set_input_value("ms-rows", &rows.to_string());
    set_input_value("ms-cols", &cols.to_string());
    (rows, cols)
}

fn set_minesweeper_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("ms-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("ms-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_minesweeper_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("ms-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn minesweeper_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initMSGrid && window.initMSGrid()", "", false),
        (
            "计算核心分析",
            "window.solveMSPuzzleUI && window.solveMSPuzzleUI()",
            "ms-solve-btn",
            true,
        ),
        ("清空标记", "window.clearMSGrid && window.clearMSGrid()", "", false),
        ("简单示例", "window.buildSimpleMSExample && window.buildSimpleMSExample()", "", false),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_binairo_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("binairo-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let size_inputs = "<div style=\"margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:10px;\"><input type=\"number\" id=\"bi-rows\" placeholder=\"行数 (偶数, 默认10)\" value=\"10\" min=\"4\" max=\"16\" step=\"2\" style=\"width:100%;\" class=\"cyber-input\"><input type=\"number\" id=\"bi-cols\" placeholder=\"列数 (偶数, 默认10)\" value=\"10\" min=\"4\" max=\"16\" step=\"2\" style=\"width:100%;\" class=\"cyber-input\"></div>";
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("binairo-workspace"),
        logic_title("BINAIRO", &object_with_pairs(&[("color", "var(--neon-purple)")])) ,
        size_inputs,
        logic_action_grid4(&binairo_action_buttons()),
        logic_stats_panel("bi", &object_with_pairs(&[
            ("countLabel", "平衡可能矩阵"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "var(--neon-purple)")
        ])),
        logic_solution_nav("bi", "showBinairoSolution", &object_with_pairs(&[("accent", "var(--neon-purple)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "左键: 切换 白圆 / 黑圆 / 空白",
                "右键: 锁定/取消锁定当前有值格子",
                "每行每列白圆与黑圆数目必须对等",
                "相同颜色的圆不能连续超过2个",
                "每行/每列的黑白排列顺序必须独一无二",
            ]),
            &object_with_pairs(&[("accent", "#00ffcc"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "binairo-workspace",
        "binairo-layout",
        &left,
        "<div id=\"binairo-grid-container\"></div>",
        Some(
            "#binairo-grid-container{--bi-cell-size:55px;display:grid;gap:2px;background:var(--neon-cyan);padding:4px;border-radius:8px;width:fit-content;margin:0 auto;border:2px solid var(--neon-cyan);box-shadow:0 0 20px rgba(0,229,255,.4)}
        .bi-cell{width:var(--bi-cell-size);height:var(--bi-cell-size);background:rgba(20,10,30,.95);border-radius:4px;display:flex;align-items:center;justify-content:center}
        .bi-cell.fixed{background:rgba(255,255,255,.1);box-shadow:inset 0 0 5px rgba(255,255,255,.2)}
        .bi-cell:hover{background:rgba(204,0,255,.2);box-shadow:inset 0 0 10px rgba(204,0,255,.4)}
        .bi-circle{width:75%;height:75%;border-radius:50%;transition:all .3s}
        .bi-circle.val-0{background-color:white;box-shadow:0 0 10px rgba(255,255,255,.8);border:1px solid #aaa}
        .bi-circle.val-1{background-color:black;box-shadow:0 0 10px rgba(0,0,0,.8);border:2px solid rgba(255,255,255,.3)}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_binairo_globals()?;
    Ok(())
}

fn install_binairo_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_binairo_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initBinairoGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_binairo_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearBinairoGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_binairo_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("buildSimpleBinairoExample"), example.as_ref())?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_binairo_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveBinairoPuzzle"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_binairo_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showBinairoSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn init_binairo_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_binairo_dimensions();
    BINAIRO_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.grid = empty_binairo_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_binairo_stats("0", "0");
    set_binairo_nav(false);
    render_binairo_grid()
}

fn clear_binairo_grid() -> Result<(), JsValue> {
    BINAIRO_STATE.with(|state| {
        let mut state = state.borrow_mut();
        for row in 0..state.rows {
            for col in 0..state.cols {
                if !state.grid[row][col].fixed {
                    state.grid[row][col].value = None;
                }
            }
        }
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_binairo_stats("0", "0");
    set_binairo_nav(false);
    render_binairo_grid()
}

fn build_simple_binairo_example() -> Result<(), JsValue> {
    set_input_value("bi-rows", "4");
    set_input_value("bi-cols", "4");
    BINAIRO_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 4;
        state.cols = 4;
        state.grid = empty_binairo_grid(4, 4);
        for (row, col, value) in [(0usize, 0usize, 1u8), (1, 0, 1), (0, 1, 0), (0, 3, 0), (2, 2, 1), (3, 3, 1)] {
            state.grid[row][col] = BinairoCell {
                value: Some(value),
                fixed: true,
            };
        }
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_binairo_stats("0", "0");
    set_binairo_nav(false);
    render_binairo_grid()
}

fn solve_binairo_puzzle_ui() -> Result<(), JsValue> {
    let snapshot = BINAIRO_STATE.with(|state| state.borrow().clone());
    let started = js_sys::Date::now();
    let result = solve_binairo(&snapshot);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时中断)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    BINAIRO_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_binairo_stats(&count_text, &elapsed);
    set_binairo_nav(has_solution);
    if has_solution {
        show_binairo_solution(0)
    } else {
        render_binairo_grid()
    }
}

fn show_binairo_solution(delta: isize) -> Result<(), JsValue> {
    BINAIRO_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = BINAIRO_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("bi-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_binairo_grid()
}

fn render_binairo_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("binairo-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = BINAIRO_STATE.with(|state| state.borrow().clone());
    container
        .unchecked_ref::<HtmlElement>()
        .style()
        .set_property("grid-template-columns", &format!("repeat({}, var(--bi-cell-size))", state.cols))?;

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("bi-cell");
            if state.grid[row][col].fixed {
                cell.class_list().add_1("fixed")?;
            }
            let value = if state.showing_solution {
                state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row).and_then(|items| items.get(col)))
                    .copied()
            } else {
                state.grid[row][col].value
            };
            if let Some(value) = value {
                let circle = document.create_element("div")?;
                circle.set_class_name(&format!("bi-circle val-{value}"));
                cell.append_child(&circle)?;
            }
            let left = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let changed = BINAIRO_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.showing_solution {
                        return false;
                    }
                    let cell = &mut state.grid[row][col];
                    cell.value = match cell.value {
                        None => Some(0),
                        Some(0) => Some(1),
                        Some(_) => None,
                    };
                    cell.fixed = false;
                    state.solutions.clear();
                    state.solution_index = 0;
                    true
                });
                if changed {
                    set_binairo_nav(false);
                    set_binairo_stats("0", "0");
                    if let Err(err) = render_binairo_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("click", left.as_ref().unchecked_ref())?;
            left.forget();

            let right = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let changed = BINAIRO_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.showing_solution || state.grid[row][col].value.is_none() {
                        return false;
                    }
                    state.grid[row][col].fixed = !state.grid[row][col].fixed;
                    state.solutions.clear();
                    state.solution_index = 0;
                    true
                });
                if changed {
                    set_binairo_nav(false);
                    set_binairo_stats("0", "0");
                    if let Err(err) = render_binairo_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("contextmenu", right.as_ref().unchecked_ref())?;
            right.forget();
            container.append_child(&cell)?;
        }
    }
    Ok(())
}

struct BinairoSolveResult {
    solutions: Vec<Vec<Vec<u8>>>,
    timed_out: bool,
}

fn solve_binairo(state: &BinairoState) -> BinairoSolveResult {
    let mut grid = vec![vec![None; state.cols]; state.rows];
    for row in 0..state.rows {
        for col in 0..state.cols {
            grid[row][col] = state.grid[row][col].value;
        }
    }
    let mut result = BinairoSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let started = js_sys::Date::now();
    binairo_backtrack(
        0,
        0,
        state.rows,
        state.cols,
        &mut grid,
        started,
        3_000.0,
        10,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn binairo_backtrack(
    row: usize,
    col: usize,
    rows: usize,
    cols: usize,
    grid: &mut [Vec<Option<u8>>],
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut BinairoSolveResult,
) -> bool {
    if result.timed_out {
        return false;
    }
    if js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return false;
    }
    if result.solutions.len() >= max_solutions {
        return true;
    }
    if row == rows {
        if binairo_rows_cols_unique(rows, cols, grid) {
            result
                .solutions
                .push(grid.iter().map(|row| row.iter().map(|value| value.unwrap_or(0)).collect()).collect());
            return result.solutions.len() >= max_solutions;
        }
        return false;
    }

    let mut next_row = row;
    let mut next_col = col + 1;
    if next_col == cols {
        next_row += 1;
        next_col = 0;
    }

    if let Some(value) = grid[row][col] {
        if !binairo_is_valid(rows, cols, grid, row, col, value) {
            return false;
        }
        return binairo_backtrack(
            next_row,
            next_col,
            rows,
            cols,
            grid,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
    }

    for value in [0u8, 1u8] {
        if binairo_is_valid(rows, cols, grid, row, col, value) {
            grid[row][col] = Some(value);
            if binairo_backtrack(
                next_row,
                next_col,
                rows,
                cols,
                grid,
                started,
                time_limit_ms,
                max_solutions,
                result,
            ) {
                return true;
            }
            grid[row][col] = None;
        }
    }
    false
}

fn binairo_is_valid(
    rows: usize,
    cols: usize,
    grid: &[Vec<Option<u8>>],
    row: usize,
    col: usize,
    value: u8,
) -> bool {
    if col >= 2 && grid[row][col - 1] == Some(value) && grid[row][col - 2] == Some(value) {
        return false;
    }
    if row >= 2 && grid[row - 1][col] == Some(value) && grid[row - 2][col] == Some(value) {
        return false;
    }
    let mut row_count = 1usize;
    for current_col in 0..col {
        if grid[row][current_col] == Some(value) {
            row_count += 1;
        }
    }
    if row_count > cols / 2 {
        return false;
    }
    let mut col_count = 1usize;
    for current_row in 0..row {
        if grid[current_row][col] == Some(value) {
            col_count += 1;
        }
    }
    if col_count > rows / 2 {
        return false;
    }
    if col + 1 == cols && row_count != cols / 2 {
        return false;
    }
    if row + 1 == rows && col_count != rows / 2 {
        return false;
    }
    true
}

fn binairo_rows_cols_unique(rows: usize, cols: usize, grid: &[Vec<Option<u8>>]) -> bool {
    let mut row_keys = HashSet::new();
    for row in 0..rows {
        let key = (0..cols)
            .map(|col| grid[row][col].unwrap_or(0).to_string())
            .collect::<String>();
        if !row_keys.insert(key) {
            return false;
        }
    }
    let mut col_keys = HashSet::new();
    for col in 0..cols {
        let key = (0..rows)
            .map(|row| grid[row][col].unwrap_or(0).to_string())
            .collect::<String>();
        if !col_keys.insert(key) {
            return false;
        }
    }
    true
}

fn read_binairo_dimensions() -> (usize, usize) {
    let mut rows = read_usize_input("bi-rows", 10).clamp(4, 16);
    let mut cols = read_usize_input("bi-cols", 10).clamp(4, 16);
    if rows % 2 != 0 {
        rows = (rows + 1).min(16);
    }
    if cols % 2 != 0 {
        cols = (cols + 1).min(16);
    }
    set_input_value("bi-rows", &rows.to_string());
    set_input_value("bi-cols", &cols.to_string());
    (rows, cols)
}

fn set_binairo_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("bi-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("bi-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_binairo_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("bi-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn empty_binairo_grid(rows: usize, cols: usize) -> Vec<Vec<BinairoCell>> {
    vec![
        vec![
            BinairoCell {
                value: None,
                fixed: false,
            };
            cols
        ];
        rows
    ]
}

fn binairo_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initBinairoGrid && window.initBinairoGrid()", "", false),
        (
            "计算核心分析",
            "window.solveBinairoPuzzle && window.solveBinairoPuzzle()",
            "bi-solve-btn",
            true,
        ),
        ("清空非固定", "window.clearBinairoGrid && window.clearBinairoGrid()", "", false),
        (
            "简单示例",
            "window.buildSimpleBinairoExample && window.buildSimpleBinairoExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_tatamibari_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("tatamibari-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let symbol_button = "<div style=\"margin-bottom:1.5rem;display:flex;gap:10px\"><button class=\"cyber-button\" style=\"flex:1\" id=\"ttb-symbol-btn\" onclick=\"window.cycleTtbSymbol && window.cycleTtbSymbol()\"><span class=\"cyber-button__tag\">当前符号: +</span></button></div>";
    let left = format!(
        "{}{}{}{}{}{}{}{}",
        logic_back_button("tatamibari-workspace"),
        logic_title("TATAMIBARI", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "ttb-rows",
            "ttb-cols",
            &object_with_pairs(&[
                ("rowVal", "6"),
                ("colVal", "6"),
                ("rowMin", "2"),
                ("colMin", "2"),
                ("rowMax", "12"),
                ("colMax", "12")
            ])
        ),
        logic_action_grid4(&tatamibari_action_buttons()),
        symbol_button,
        logic_stats_panel("ttb", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("ttb", "showTatamibariSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "点击格子放置/清除当前符号（+/-/|）",
                "+ 正方形 | - 横长 | | 竖长",
                "每个矩形恰含一个符号，不允许四区交角",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "tatamibari-workspace",
        "tatamibari-layout",
        &left,
        "<div id=\"ttb-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none\"></div>",
        Some(
            "#ttb-grid-container{gap:0}
        .ttb-cell{width:42px;height:42px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);font-size:1.3rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s}
        .ttb-cell:hover{background:rgba(0,255,231,.08)}
        .ttb-cell.clue{color:#fff;text-shadow:0 0 6px rgba(0,255,231,.6)}
        .ttb-cell.bt{border-top:3px solid var(--neon-cyan)}.ttb-cell.bb{border-bottom:3px solid var(--neon-cyan)}.ttb-cell.bl{border-left:3px solid var(--neon-cyan)}.ttb-cell.br{border-right:3px solid var(--neon-cyan)}
        .ttb-region-color{opacity:.18;position:absolute;inset:0;pointer-events:none}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_tatamibari_globals()?;
    Ok(())
}

fn install_tatamibari_globals() -> Result<(), JsValue> {
    let cycle = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = cycle_tatamibari_symbol() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("cycleTtbSymbol"), cycle.as_ref())?;
    cycle.forget();

    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_tatamibari_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initTatamibariGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_tatamibari_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearTatamibariGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_tatamibari_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("buildSimpleTatamibariExample"),
        example.as_ref(),
    )?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_tatamibari_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveTatamibariUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_tatamibari_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        window()?.as_ref(),
        &JsValue::from_str("showTatamibariSolution"),
        show.as_ref(),
    )?;
    show.forget();
    Ok(())
}

fn init_tatamibari_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_tatamibari_dimensions();
    TATAMIBARI_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.clues = empty_tatamibari_grid(rows, cols);
        state.current_symbol = TatamibariSymbol::Square;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tatamibari_symbol_button(TatamibariSymbol::Square);
    set_tatamibari_stats("-", "-");
    set_tatamibari_nav(false);
    render_tatamibari_grid()
}

fn clear_tatamibari_grid() -> Result<(), JsValue> {
    TATAMIBARI_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rows = state.rows;
        let cols = state.cols;
        state.clues = empty_tatamibari_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tatamibari_stats("-", "-");
    set_tatamibari_nav(false);
    render_tatamibari_grid()
}

fn build_simple_tatamibari_example() -> Result<(), JsValue> {
    set_input_value("ttb-rows", "4");
    set_input_value("ttb-cols", "4");
    TATAMIBARI_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 4;
        state.cols = 4;
        state.clues = empty_tatamibari_grid(4, 4);
        state.clues[0][2] = Some(TatamibariSymbol::Horizontal);
        state.clues[2][0] = Some(TatamibariSymbol::Vertical);
        state.clues[1][2] = Some(TatamibariSymbol::Horizontal);
        state.clues[3][1] = Some(TatamibariSymbol::Horizontal);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_tatamibari_stats("-", "-");
    set_tatamibari_nav(false);
    render_tatamibari_grid()
}

fn cycle_tatamibari_symbol() -> Result<(), JsValue> {
    let symbol = TATAMIBARI_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.current_symbol = match state.current_symbol {
            TatamibariSymbol::Square => TatamibariSymbol::Horizontal,
            TatamibariSymbol::Horizontal => TatamibariSymbol::Vertical,
            TatamibariSymbol::Vertical => TatamibariSymbol::Square,
        };
        state.current_symbol
    });
    set_tatamibari_symbol_button(symbol);
    Ok(())
}

fn solve_tatamibari_ui() -> Result<(), JsValue> {
    let snapshot = TATAMIBARI_STATE.with(|state| state.borrow().clone());
    if tatamibari_clue_count(&snapshot.clues) == 0 {
        set_tatamibari_stats("请先放置符号", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_tatamibari(snapshot.rows, snapshot.cols, &snapshot.clues);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    TATAMIBARI_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_tatamibari_stats(&count_text, &elapsed);
    set_tatamibari_nav(has_solution);
    if has_solution {
        show_tatamibari_solution(0)
    } else {
        render_tatamibari_grid()
    }
}

fn show_tatamibari_solution(delta: isize) -> Result<(), JsValue> {
    TATAMIBARI_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = TATAMIBARI_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("ttb-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_tatamibari_grid()
}

fn render_tatamibari_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("ttb-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = TATAMIBARI_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},42px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},42px)", state.rows))?;
    let region_bounds = if state.showing_solution {
        state
            .solutions
            .get(state.solution_index)
            .map(|solution| tatamibari_region_bounds(solution))
            .unwrap_or_default()
    } else {
        Vec::new()
    };

    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("ttb-cell");
            apply_tatamibari_boundaries(&cell, &state, &region_bounds, row, col)?;
            if let Some(symbol) = state.clues[row][col] {
                cell.class_list().add_1("clue")?;
                cell.set_text_content(Some(tatamibari_symbol_text(symbol)));
            }
            if state.showing_solution {
                if let Some(solution) = state.solutions.get(state.solution_index) {
                    let id = solution[row][col];
                    if id >= 0 {
                        let overlay = document.create_element("div")?;
                        overlay.set_class_name("ttb-region-color");
                        overlay
                            .unchecked_ref::<HtmlElement>()
                            .style()
                            .set_property("background", TATAMIBARI_COLORS[id as usize % TATAMIBARI_COLORS.len()])?;
                        cell.append_child(&overlay)?;
                    }
                }
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                let changed = TATAMIBARI_STATE.with(|state| {
                    let mut state = state.borrow_mut();
                    if state.showing_solution {
                        return false;
                    }
                    let symbol = state.current_symbol;
                    state.clues[row][col] = if state.clues[row][col] == Some(symbol) {
                        None
                    } else {
                        Some(symbol)
                    };
                    state.solutions.clear();
                    state.solution_index = 0;
                    true
                });
                if changed {
                    set_tatamibari_nav(false);
                    set_tatamibari_stats("-", "-");
                    if let Err(err) = render_tatamibari_grid() {
                        console::error_1(&err);
                    }
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            container.append_child(&cell)?;
        }
    }
    Ok(())
}

fn apply_tatamibari_boundaries(
    cell: &Element,
    state: &TatamibariState,
    region_bounds: &[Option<TatamibariBounds>],
    row: usize,
    col: usize,
) -> Result<(), JsValue> {
    if state.showing_solution {
        if let Some(solution) = state.solutions.get(state.solution_index) {
            let id = solution[row][col];
            if id >= 0 {
                if let Some(Some(bounds)) = region_bounds.get(id as usize) {
                    if row == bounds.row_min {
                        cell.class_list().add_1("bt")?;
                    }
                    if row == bounds.row_max {
                        cell.class_list().add_1("bb")?;
                    }
                    if col == bounds.col_min {
                        cell.class_list().add_1("bl")?;
                    }
                    if col == bounds.col_max {
                        cell.class_list().add_1("br")?;
                    }
                    return Ok(());
                }
            }
        }
    }
    if row == 0 {
        cell.class_list().add_1("bt")?;
    }
    if row + 1 == state.rows {
        cell.class_list().add_1("bb")?;
    }
    if col == 0 {
        cell.class_list().add_1("bl")?;
    }
    if col + 1 == state.cols {
        cell.class_list().add_1("br")?;
    }
    Ok(())
}

#[derive(Clone, Copy)]
struct TatamibariClue {
    row: usize,
    col: usize,
    symbol: TatamibariSymbol,
}

#[derive(Clone, Copy)]
struct TatamibariBounds {
    row_min: usize,
    row_max: usize,
    col_min: usize,
    col_max: usize,
}

struct TatamibariSolveResult {
    solutions: Vec<Vec<Vec<isize>>>,
    timed_out: bool,
}

fn solve_tatamibari(
    rows: usize,
    cols: usize,
    clues: &[Vec<Option<TatamibariSymbol>>],
) -> TatamibariSolveResult {
    const MAX_SOLUTIONS: usize = 20;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let mut clue_list = Vec::new();
    for row in 0..rows {
        for col in 0..cols {
            if let Some(symbol) = clues[row][col] {
                clue_list.push(TatamibariClue { row, col, symbol });
            }
        }
    }
    if clue_list.is_empty() {
        return TatamibariSolveResult {
            solutions: Vec::new(),
            timed_out: false,
        };
    }

    let mut board = vec![-1isize; rows * cols];
    let mut result = TatamibariSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let started = js_sys::Date::now();
    tatamibari_dfs(
        rows,
        cols,
        &clue_list,
        &mut board,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn tatamibari_dfs(
    rows: usize,
    cols: usize,
    clues: &[TatamibariClue],
    board: &mut [isize],
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut TatamibariSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    if js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    let Some(position) = board.iter().position(|value| *value == -1) else {
        result.solutions.push(tatamibari_snapshot(rows, cols, board));
        return;
    };
    let row = position / cols;
    let col = position % cols;
    for height in 1..=(rows - row) {
        for width in 1..=(cols - col) {
            if result.timed_out || result.solutions.len() >= max_solutions {
                return;
            }
            if !tatamibari_empty(row, col, width, height, cols, board) {
                let right_blocked = (0..height)
                    .any(|delta_row| board[(row + delta_row) * cols + col + width - 1] != -1);
                if right_blocked {
                    break;
                }
                continue;
            }
            let clue_index = tatamibari_enclosed(row, col, width, height, clues);
            let Some(clue_index) = clue_index else {
                continue;
            };
            let clue = clues[clue_index];
            if !tatamibari_shape_matches(clue.symbol, width, height) {
                continue;
            }
            tatamibari_fill(row, col, width, height, cols, board, clue_index as isize);
            if tatamibari_corners_ok(rows, cols, row, col, width, height, board) {
                tatamibari_dfs(
                    rows,
                    cols,
                    clues,
                    board,
                    started,
                    time_limit_ms,
                    max_solutions,
                    result,
                );
            }
            tatamibari_fill(row, col, width, height, cols, board, -1);
        }
    }
}

fn tatamibari_empty(row: usize, col: usize, width: usize, height: usize, cols: usize, board: &[isize]) -> bool {
    for delta_row in 0..height {
        for delta_col in 0..width {
            if board[(row + delta_row) * cols + col + delta_col] != -1 {
                return false;
            }
        }
    }
    true
}

fn tatamibari_fill(row: usize, col: usize, width: usize, height: usize, cols: usize, board: &mut [isize], value: isize) {
    for delta_row in 0..height {
        for delta_col in 0..width {
            board[(row + delta_row) * cols + col + delta_col] = value;
        }
    }
}

fn tatamibari_enclosed(
    row: usize,
    col: usize,
    width: usize,
    height: usize,
    clues: &[TatamibariClue],
) -> Option<usize> {
    let mut found = None;
    for (index, clue) in clues.iter().enumerate() {
        if clue.row >= row && clue.row < row + height && clue.col >= col && clue.col < col + width {
            if found.is_some() {
                return None;
            }
            found = Some(index);
        }
    }
    found
}

fn tatamibari_shape_matches(symbol: TatamibariSymbol, width: usize, height: usize) -> bool {
    match symbol {
        TatamibariSymbol::Square => width == height,
        TatamibariSymbol::Horizontal => width > height,
        TatamibariSymbol::Vertical => height > width,
    }
}

fn tatamibari_corners_ok(
    rows: usize,
    cols: usize,
    row: usize,
    col: usize,
    width: usize,
    height: usize,
    board: &[isize],
) -> bool {
    let row_start = row.saturating_sub(1);
    let row_end = (row + height - 1).min(rows.saturating_sub(2));
    let col_start = col.saturating_sub(1);
    let col_end = (col + width - 1).min(cols.saturating_sub(2));
    for check_row in row_start..=row_end {
        for check_col in col_start..=col_end {
            let a = board[check_row * cols + check_col];
            let b = board[check_row * cols + check_col + 1];
            let c = board[(check_row + 1) * cols + check_col];
            let d = board[(check_row + 1) * cols + check_col + 1];
            if a >= 0
                && b >= 0
                && c >= 0
                && d >= 0
                && a != b
                && a != c
                && a != d
                && b != c
                && b != d
                && c != d
            {
                return false;
            }
        }
    }
    true
}

fn tatamibari_snapshot(rows: usize, cols: usize, board: &[isize]) -> Vec<Vec<isize>> {
    let mut solution = vec![vec![-1isize; cols]; rows];
    for row in 0..rows {
        for col in 0..cols {
            solution[row][col] = board[row * cols + col];
        }
    }
    solution
}

fn tatamibari_region_bounds(solution: &[Vec<isize>]) -> Vec<Option<TatamibariBounds>> {
    let mut bounds = Vec::<Option<TatamibariBounds>>::new();
    for (row, items) in solution.iter().enumerate() {
        for (col, id) in items.iter().enumerate() {
            if *id < 0 {
                continue;
            }
            let index = *id as usize;
            if bounds.len() <= index {
                bounds.resize(index + 1, None);
            }
            bounds[index] = Some(match bounds[index] {
                Some(current) => TatamibariBounds {
                    row_min: current.row_min.min(row),
                    row_max: current.row_max.max(row),
                    col_min: current.col_min.min(col),
                    col_max: current.col_max.max(col),
                },
                None => TatamibariBounds {
                    row_min: row,
                    row_max: row,
                    col_min: col,
                    col_max: col,
                },
            });
        }
    }
    bounds
}

fn read_tatamibari_dimensions() -> (usize, usize) {
    let rows = read_usize_input("ttb-rows", 6).clamp(2, 12);
    let cols = read_usize_input("ttb-cols", 6).clamp(2, 12);
    set_input_value("ttb-rows", &rows.to_string());
    set_input_value("ttb-cols", &cols.to_string());
    (rows, cols)
}

fn set_tatamibari_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("ttb-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("ttb-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_tatamibari_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("ttb-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn set_tatamibari_symbol_button(symbol: TatamibariSymbol) {
    if let Ok(document) = document() {
        if let Some(tag) = document
            .get_element_by_id("ttb-symbol-btn")
            .and_then(|button| button.query_selector(".cyber-button__tag").ok().flatten())
        {
            tag.set_text_content(Some(&format!("当前符号: {}", tatamibari_symbol_text(symbol))));
        }
    }
}

fn tatamibari_clue_count(clues: &[Vec<Option<TatamibariSymbol>>]) -> usize {
    clues
        .iter()
        .map(|row| row.iter().filter(|value| value.is_some()).count())
        .sum()
}

fn tatamibari_symbol_text(symbol: TatamibariSymbol) -> &'static str {
    match symbol {
        TatamibariSymbol::Square => "+",
        TatamibariSymbol::Horizontal => "-",
        TatamibariSymbol::Vertical => "|",
    }
}

fn empty_tatamibari_grid(rows: usize, cols: usize) -> Vec<Vec<Option<TatamibariSymbol>>> {
    vec![vec![None; cols]; rows]
}

const TATAMIBARI_COLORS: &[&str] = &[
    "#ff6b6b",
    "#ffd93d",
    "#6bcb77",
    "#4d96ff",
    "#ff6ec7",
    "#845ec2",
    "#ffc75f",
    "#00c9a7",
    "#c34a36",
    "#008f7a",
];

fn tatamibari_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        (
            "重置网格",
            "window.initTatamibariGrid && window.initTatamibariGrid()",
            "",
            false,
        ),
        (
            "计算核心分析",
            "window.solveTatamibariUI && window.solveTatamibariUI()",
            "ttb-solve-btn",
            true,
        ),
        (
            "清空填涂",
            "window.clearTatamibariGrid && window.clearTatamibariGrid()",
            "",
            false,
        ),
        (
            "简单示例",
            "window.buildSimpleTatamibariExample && window.buildSimpleTatamibariExample()",
            "",
            false,
        ),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn append_yajisan_workspace() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("yajisankazusan-workspace").is_some() {
        return Ok(());
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(());
    };
    let left = format!(
        "{}{}{}{}{}{}{}",
        logic_back_button("yajisankazusan-workspace"),
        logic_title("YAJISAN-KAZUSAN", &object_with_pairs(&[("color", "var(--neon-cyan)")])) ,
        logic_size_inputs(
            "yk-rows",
            "yk-cols",
            &object_with_pairs(&[
                ("rowVal", "7"),
                ("colVal", "7"),
                ("rowMin", "3"),
                ("colMin", "3"),
                ("rowMax", "12"),
                ("colMax", "12")
            ])
        ),
        logic_action_grid4(&yajisan_action_buttons()),
        logic_stats_panel("yk", &object_with_pairs(&[
            ("countLabel", "解记录数"),
            ("timeLabel", "AI thinking耗时"),
            ("accent", "#00e5ff")
        ])),
        logic_solution_nav("yk", "showYKSolution", &object_with_pairs(&[("accent", "var(--neon-cyan)")])) ,
        logic_instructions(
            &array_from_strings(&[
                "点击格子输入线索：数字+方向，如 2r",
                "方向: u=↑ d=↓ l=← r=→",
                "涂黑格不能相邻，未涂黑格必须全部连通",
                "未涂黑的线索格约束该方向涂黑数，涂黑线索被忽略",
            ]),
            &object_with_pairs(&[("accent", "var(--neon-cyan)"), ("title", "系统法则")])
        )
    );
    let html = logic_workspace(
        "yajisankazusan-workspace",
        "yajisankazusan-layout",
        &left,
        "<div id=\"yk-grid-container\" style=\"position:relative;padding:10px;background:rgba(0,0,0,.5);border-radius:8px;border:1px solid #00ffe7;box-shadow:0 0 15px rgba(0,255,231,.2);display:inline-grid;user-select:none\"></div>",
        Some(
            "#yk-grid-container{gap:0}
        .yk-cell{width:44px;height:44px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);font-size:.75rem;color:var(--neon-cyan,#00ffe7);font-weight:700;position:relative;flex-direction:column;line-height:1.1}
        .yk-cell:hover{background:rgba(0,255,231,.08)}
        .yk-cell.clue-cell{background:rgba(0,255,231,.08)}
        .yk-cell.shaded{background:rgba(100,100,100,.7);border-color:rgba(150,150,150,.5)}
        .yk-cell.shaded .yk-clue-text{opacity:.35}
        .yk-cell .yk-clue-text,.yk-cell .yk-dir-text{pointer-events:none;text-align:center}
        .yk-cell .yk-clue-text{font-size:.8rem}
        .yk-cell .yk-dir-text{font-size:.6rem;opacity:.7}
        .yk-cell input.yk-input{width:100%;height:100%;border:0;background:transparent;color:#fff;text-align:center;font-size:.8rem;font-weight:700;outline:0;padding:0;margin:0}
        .yk-cell.editing{outline:2px solid var(--neon-cyan);z-index:10;background:rgba(0,255,231,.15)}",
        ),
    );
    container.insert_adjacent_html("beforeend", &html)?;
    install_yajisan_globals()?;
    Ok(())
}

fn install_yajisan_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_yajisan_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initYKGrid"), init.as_ref())?;
    init.forget();

    let clear = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = clear_yajisan_grid() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("clearYKGrid"), clear.as_ref())?;
    clear.forget();

    let example = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = build_simple_yajisan_example() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("buildSimpleYKExample"), example.as_ref())?;
    example.forget();

    let solve = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = solve_yajisan_puzzle_ui() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("solveYKPuzzleUI"), solve.as_ref())?;
    solve.forget();

    let show = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |delta: JsValue| {
        if let Err(err) = show_yajisan_solution(delta.as_f64().unwrap_or(0.0) as isize) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("showYKSolution"), show.as_ref())?;
    show.forget();
    Ok(())
}

fn init_yajisan_grid() -> Result<(), JsValue> {
    let (rows, cols) = read_yajisan_dimensions();
    YAJISAN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = rows;
        state.cols = cols;
        state.clues = empty_yajisan_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_yajisan_stats("-", "-");
    set_yajisan_nav(false);
    render_yajisan_grid()
}

fn clear_yajisan_grid() -> Result<(), JsValue> {
    YAJISAN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let rows = state.rows;
        let cols = state.cols;
        state.clues = empty_yajisan_grid(rows, cols);
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_yajisan_stats("-", "-");
    set_yajisan_nav(false);
    render_yajisan_grid()
}

fn build_simple_yajisan_example() -> Result<(), JsValue> {
    set_input_value("yk-rows", "5");
    set_input_value("yk-cols", "5");
    YAJISAN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.rows = 5;
        state.cols = 5;
        state.clues = empty_yajisan_grid(5, 5);
        for (row, col, value, direction) in [
            (0usize, 2usize, 1usize, YajisanDirection::Down),
            (1, 1, 0, YajisanDirection::Right),
            (1, 4, 1, YajisanDirection::Left),
            (2, 0, 1, YajisanDirection::Down),
            (2, 3, 1, YajisanDirection::Up),
            (3, 2, 0, YajisanDirection::Left),
            (4, 1, 1, YajisanDirection::Up),
            (4, 4, 0, YajisanDirection::Down),
        ] {
            state.clues[row][col] = Some(YajisanClue { value, direction });
        }
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
    set_yajisan_stats("-", "-");
    set_yajisan_nav(false);
    render_yajisan_grid()
}

fn solve_yajisan_puzzle_ui() -> Result<(), JsValue> {
    let snapshot = YAJISAN_STATE.with(|state| state.borrow().clone());
    if yajisan_clue_count(&snapshot.clues) == 0 {
        set_yajisan_stats("请先输入线索", "-");
        return Ok(());
    }
    let started = js_sys::Date::now();
    let result = solve_yajisan(snapshot.rows, snapshot.cols, &snapshot.clues);
    let elapsed = logic_format_elapsed(JsValue::from_f64(js_sys::Date::now() - started));
    let count_text = if result.timed_out {
        format!("{}+ (超时)", result.solutions.len())
    } else if result.solutions.is_empty() {
        "未找到解".to_string()
    } else {
        result.solutions.len().to_string()
    };
    let has_solution = !result.solutions.is_empty();
    YAJISAN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.solutions = result.solutions;
        state.solution_index = 0;
        state.showing_solution = has_solution;
    });
    set_yajisan_stats(&count_text, &elapsed);
    set_yajisan_nav(has_solution);
    if has_solution {
        show_yajisan_solution(0)
    } else {
        render_yajisan_grid()
    }
}

fn show_yajisan_solution(delta: isize) -> Result<(), JsValue> {
    YAJISAN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if state.solutions.is_empty() {
            return;
        }
        let len = state.solutions.len() as isize;
        state.solution_index = ((state.solution_index as isize + delta + len) % len) as usize;
        state.showing_solution = true;
    });
    let (index, len) = YAJISAN_STATE.with(|state| {
        let state = state.borrow();
        (state.solution_index + 1, state.solutions.len())
    });
    if let Some(counter) = document()?.get_element_by_id("yk-solution-counter") {
        counter.set_text_content(Some(&format!("{index} / {len}")));
    }
    render_yajisan_grid()
}

fn render_yajisan_grid() -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("yk-grid-container") else {
        return Ok(());
    };
    container.set_inner_html("");
    let state = YAJISAN_STATE.with(|state| state.borrow().clone());
    let style = container.unchecked_ref::<HtmlElement>().style();
    style.set_property("grid-template-columns", &format!("repeat({},44px)", state.cols))?;
    style.set_property("grid-template-rows", &format!("repeat({},44px)", state.rows))?;
    for row in 0..state.rows {
        for col in 0..state.cols {
            let cell = document.create_element("div")?;
            cell.set_class_name("yk-cell");
            cell.set_attribute("data-r", &row.to_string())?;
            cell.set_attribute("data-c", &col.to_string())?;
            if let Some(clue) = state.clues[row][col] {
                cell.class_list().add_1("clue-cell")?;
                cell.set_inner_html(&format!(
                    "<span class=\"yk-clue-text\">{}</span><span class=\"yk-dir-text\">{}</span>",
                    clue.value,
                    yajisan_direction_arrow(clue.direction)
                ));
            }
            if state.showing_solution
                && state
                    .solutions
                    .get(state.solution_index)
                    .and_then(|solution| solution.get(row).and_then(|items| items.get(col)))
                    .copied()
                    .unwrap_or(0)
                    == 1
            {
                cell.class_list().add_1("shaded")?;
            }
            let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
                event.prevent_default();
                if let Err(err) = edit_yajisan_cell(row, col) {
                    console::error_1(&err);
                }
            }));
            cell.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
            click.forget();
            container.append_child(&cell)?;
        }
    }
    Ok(())
}

fn edit_yajisan_cell(row: usize, col: usize) -> Result<(), JsValue> {
    let showing = YAJISAN_STATE.with(|state| state.borrow().showing_solution);
    if showing {
        return Ok(());
    }
    let document = document()?;
    let Some(container) = document.get_element_by_id("yk-grid-container") else {
        return Ok(());
    };
    let selector = format!(".yk-cell[data-r=\"{row}\"][data-c=\"{col}\"]");
    let Some(cell) = container.query_selector(&selector)? else {
        return Ok(());
    };
    cell.set_class_name("yk-cell editing");
    cell.set_inner_html("");
    let current = YAJISAN_STATE.with(|state| {
        state
            .borrow()
            .clues
            .get(row)
            .and_then(|items| items.get(col))
            .and_then(|value| *value)
    });
    let input = document.create_element("input")?.dyn_into::<HtmlInputElement>()?;
    input.set_type("text");
    input.set_class_name("yk-input");
    input.set_attribute("maxlength", "3")?;
    input.set_placeholder("2r");
    if let Some(clue) = current {
        input.set_value(&format!("{}{}", clue.value, yajisan_direction_letter(clue.direction)));
    }
    cell.append_child(input.as_ref())?;
    input.focus()?;

    let input_for_blur = input.clone();
    let blur = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        commit_yajisan_value(row, col, &input_for_blur.value());
        if let Err(err) = render_yajisan_grid() {
            console::error_1(&err);
        }
    }));
    input.add_event_listener_with_callback("blur", blur.as_ref().unchecked_ref())?;
    blur.forget();

    let input_for_key = input.clone();
    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        let key = event.key();
        if key == "Enter" {
            let _ = input_for_key.blur();
        } else if key == "Escape" || key == "Delete" || key == "Backspace" {
            input_for_key.set_value("");
            let _ = input_for_key.blur();
        }
    }));
    input.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
    keydown.forget();
    Ok(())
}

fn commit_yajisan_value(row: usize, col: usize, value: &str) {
    let parsed = parse_yajisan_clue(value);
    YAJISAN_STATE.with(|state| {
        let mut state = state.borrow_mut();
        if row >= state.rows || col >= state.cols {
            return;
        }
        state.clues[row][col] = parsed;
        state.solutions.clear();
        state.solution_index = 0;
        state.showing_solution = false;
    });
}

#[derive(Clone)]
struct YajisanSolverClue {
    position: usize,
    value: usize,
    seen: Vec<usize>,
}

struct YajisanSolveResult {
    solutions: Vec<Vec<Vec<u8>>>,
    timed_out: bool,
}

fn solve_yajisan(rows: usize, cols: usize, clues: &[Vec<Option<YajisanClue>>]) -> YajisanSolveResult {
    const MAX_SOLUTIONS: usize = 50;
    const TIME_LIMIT_MS: f64 = 3_500.0;

    let mut solver_clues = Vec::new();
    for row in 0..rows {
        for col in 0..cols {
            if let Some(clue) = clues[row][col] {
                solver_clues.push(YajisanSolverClue {
                    position: row * cols + col,
                    value: clue.value,
                    seen: yajisan_seen_cells(rows, cols, row, col, clue.direction),
                });
            }
        }
    }
    let mut grid = vec![0u8; rows * cols];
    let mut result = YajisanSolveResult {
        solutions: Vec::new(),
        timed_out: false,
    };
    let mut steps = 0usize;
    let started = js_sys::Date::now();
    yajisan_dfs(
        0,
        rows,
        cols,
        &solver_clues,
        &mut grid,
        &mut steps,
        started,
        TIME_LIMIT_MS,
        MAX_SOLUTIONS,
        &mut result,
    );
    result
}

#[allow(clippy::too_many_arguments)]
fn yajisan_dfs(
    index: usize,
    rows: usize,
    cols: usize,
    clues: &[YajisanSolverClue],
    grid: &mut [u8],
    steps: &mut usize,
    started: f64,
    time_limit_ms: f64,
    max_solutions: usize,
    result: &mut YajisanSolveResult,
) {
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    *steps += 1;
    if (*steps & 255) == 0 && js_sys::Date::now() - started > time_limit_ms {
        result.timed_out = true;
        return;
    }
    if index == rows * cols {
        if yajisan_clues_exact(clues, grid) && yajisan_white_connected(rows, cols, grid) {
            result.solutions.push(yajisan_snapshot(rows, cols, grid));
        }
        return;
    }

    grid[index] = 0;
    if yajisan_prune(index, clues, grid) {
        yajisan_dfs(
            index + 1,
            rows,
            cols,
            clues,
            grid,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
    }
    if result.timed_out || result.solutions.len() >= max_solutions {
        return;
    }
    grid[index] = 1;
    if yajisan_no_adjacent_black(index, cols, grid) && yajisan_prune(index, clues, grid) {
        yajisan_dfs(
            index + 1,
            rows,
            cols,
            clues,
            grid,
            steps,
            started,
            time_limit_ms,
            max_solutions,
            result,
        );
    }
    grid[index] = 0;
}

fn yajisan_no_adjacent_black(index: usize, cols: usize, grid: &[u8]) -> bool {
    let row = index / cols;
    let col = index % cols;
    !(row > 0 && grid[index - cols] == 1) && !(col > 0 && grid[index - 1] == 1)
}

fn yajisan_clues_exact(clues: &[YajisanSolverClue], grid: &[u8]) -> bool {
    for clue in clues {
        if grid[clue.position] == 1 {
            continue;
        }
        let count = clue.seen.iter().filter(|position| grid[**position] == 1).count();
        if count != clue.value {
            return false;
        }
    }
    true
}

fn yajisan_prune(index: usize, clues: &[YajisanSolverClue], grid: &[u8]) -> bool {
    for clue in clues {
        if grid[clue.position] == 1 {
            continue;
        }
        let mut count = 0usize;
        let mut remaining = 0usize;
        for position in &clue.seen {
            if grid[*position] == 1 {
                count += 1;
            } else if *position > index {
                remaining += 1;
            }
        }
        if count > clue.value || count + remaining < clue.value {
            return false;
        }
    }
    true
}

fn yajisan_white_connected(rows: usize, cols: usize, grid: &[u8]) -> bool {
    let total_white = grid.iter().filter(|value| **value == 0).count();
    if total_white == 0 {
        return false;
    }
    let Some(start) = grid.iter().position(|value| *value == 0) else {
        return false;
    };
    let mut visited = vec![false; rows * cols];
    let mut queue = VecDeque::new();
    visited[start] = true;
    queue.push_back(start);
    let mut reached = 1usize;
    while let Some(position) = queue.pop_front() {
        let row = position / cols;
        let col = position % cols;
        let neighbors = [
            row.checked_sub(1).map(|r| r * cols + col),
            (row + 1 < rows).then_some((row + 1) * cols + col),
            col.checked_sub(1).map(|c| row * cols + c),
            (col + 1 < cols).then_some(row * cols + col + 1),
        ];
        for neighbor in neighbors.into_iter().flatten() {
            if grid[neighbor] == 0 && !visited[neighbor] {
                visited[neighbor] = true;
                reached += 1;
                queue.push_back(neighbor);
            }
        }
    }
    reached == total_white
}

fn yajisan_seen_cells(
    rows: usize,
    cols: usize,
    row: usize,
    col: usize,
    direction: YajisanDirection,
) -> Vec<usize> {
    let mut seen = Vec::new();
    match direction {
        YajisanDirection::Up => {
            for next_row in (0..row).rev() {
                seen.push(next_row * cols + col);
            }
        }
        YajisanDirection::Down => {
            for next_row in row + 1..rows {
                seen.push(next_row * cols + col);
            }
        }
        YajisanDirection::Left => {
            for next_col in (0..col).rev() {
                seen.push(row * cols + next_col);
            }
        }
        YajisanDirection::Right => {
            for next_col in col + 1..cols {
                seen.push(row * cols + next_col);
            }
        }
    }
    seen
}

fn yajisan_snapshot(rows: usize, cols: usize, grid: &[u8]) -> Vec<Vec<u8>> {
    let mut solution = vec![vec![0u8; cols]; rows];
    for row in 0..rows {
        for col in 0..cols {
            solution[row][col] = grid[row * cols + col];
        }
    }
    solution
}

fn parse_yajisan_clue(value: &str) -> Option<YajisanClue> {
    let trimmed = value.trim().to_ascii_lowercase();
    if trimmed.len() < 2 {
        return None;
    }
    let (number, direction) = trimmed.split_at(trimmed.len() - 1);
    let value = number.trim().parse::<usize>().ok()?;
    let direction = match direction {
        "u" => YajisanDirection::Up,
        "d" => YajisanDirection::Down,
        "l" => YajisanDirection::Left,
        "r" => YajisanDirection::Right,
        _ => return None,
    };
    Some(YajisanClue { value, direction })
}

fn read_yajisan_dimensions() -> (usize, usize) {
    let rows = read_usize_input("yk-rows", 7).clamp(3, 12);
    let cols = read_usize_input("yk-cols", 7).clamp(3, 12);
    set_input_value("yk-rows", &rows.to_string());
    set_input_value("yk-cols", &cols.to_string());
    (rows, cols)
}

fn set_yajisan_stats(count: &str, elapsed: &str) {
    if let Ok(document) = document() {
        if let Some(count_el) = document.get_element_by_id("yk-solutionsCount") {
            count_el.set_text_content(Some(count));
        }
        if let Some(time_el) = document.get_element_by_id("yk-timeElapsed") {
            time_el.set_text_content(Some(elapsed));
        }
    }
}

fn set_yajisan_nav(visible: bool) {
    if let Ok(document) = document() {
        if let Some(nav) = document.get_element_by_id("yk-solution-nav") {
            set_display(&nav, if visible { "flex" } else { "none" });
        }
    }
}

fn yajisan_clue_count(clues: &[Vec<Option<YajisanClue>>]) -> usize {
    clues
        .iter()
        .map(|row| row.iter().filter(|value| value.is_some()).count())
        .sum()
}

fn empty_yajisan_grid(rows: usize, cols: usize) -> Vec<Vec<Option<YajisanClue>>> {
    vec![vec![None; cols]; rows]
}

fn yajisan_direction_arrow(direction: YajisanDirection) -> &'static str {
    match direction {
        YajisanDirection::Up => "↑",
        YajisanDirection::Down => "↓",
        YajisanDirection::Left => "←",
        YajisanDirection::Right => "→",
    }
}

fn yajisan_direction_letter(direction: YajisanDirection) -> &'static str {
    match direction {
        YajisanDirection::Up => "u",
        YajisanDirection::Down => "d",
        YajisanDirection::Left => "l",
        YajisanDirection::Right => "r",
    }
}

fn yajisan_action_buttons() -> JsValue {
    let array = Array::new();
    for (label, onclick, id, glow) in [
        ("重置网格", "window.initYKGrid && window.initYKGrid()", "", false),
        ("计算核心分析", "window.solveYKPuzzleUI && window.solveYKPuzzleUI()", "yk-solve-btn", true),
        ("清空填涂", "window.clearYKGrid && window.clearYKGrid()", "", false),
        ("简单示例", "window.buildSimpleYKExample && window.buildSimpleYKExample()", "", false),
    ] {
        let button = Object::new();
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("label"), &JsValue::from_str(label));
        let _ = Reflect::set(button.as_ref(), &JsValue::from_str("onclick"), &JsValue::from_str(onclick));
        if !id.is_empty() {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("id"), &JsValue::from_str(id));
        }
        if glow {
            let _ = Reflect::set(button.as_ref(), &JsValue::from_str("glow"), &JsValue::TRUE);
        }
        array.push(button.as_ref());
    }
    array.into()
}

fn install_logic_ui() -> Result<(), JsValue> {
    let ui = Object::new();

    let back_button = Closure::<dyn FnMut(JsValue) -> JsValue>::wrap(Box::new(move |workspace_id: JsValue| {
        let workspace_id = workspace_id.as_string().unwrap_or_default();
        JsValue::from_str(&logic_back_button(&workspace_id))
    }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("backButton"), back_button.as_ref())?;
    back_button.forget();

    let stats_panel = Closure::<dyn FnMut(JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |prefix: JsValue, opts: JsValue| {
            let prefix = prefix.as_string().unwrap_or_default();
            JsValue::from_str(&logic_stats_panel(&prefix, &opts))
        },
    ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("statsPanel"), stats_panel.as_ref())?;
    stats_panel.forget();

    let format_elapsed = Closure::<dyn FnMut(JsValue) -> JsValue>::wrap(Box::new(move |value: JsValue| {
        JsValue::from_str(&logic_format_elapsed(value))
    }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("formatElapsed"), format_elapsed.as_ref())?;
    format_elapsed.forget();

    let normalize_elapsed =
        Closure::<dyn FnMut(JsValue) -> JsValue>::wrap(Box::new(move |value: JsValue| {
            JsValue::from_str(&logic_normalize_elapsed_text(value))
        }));
    Reflect::set(
        ui.as_ref(),
        &JsValue::from_str("normalizeElapsedText"),
        normalize_elapsed.as_ref(),
    )?;
    normalize_elapsed.forget();

    let solution_nav = Closure::<dyn FnMut(JsValue, JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |prefix: JsValue, show_fn: JsValue, opts: JsValue| {
            let prefix = prefix.as_string().unwrap_or_default();
            let show_fn = show_fn.as_string().unwrap_or_default();
            JsValue::from_str(&logic_solution_nav(&prefix, &show_fn, &opts))
        },
    ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("solutionNav"), solution_nav.as_ref())?;
    solution_nav.forget();

    let instructions = Closure::<dyn FnMut(JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |items: JsValue, opts: JsValue| JsValue::from_str(&logic_instructions(&items, &opts)),
    ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("instructions"), instructions.as_ref())?;
    instructions.forget();

    let title = Closure::<dyn FnMut(JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |text: JsValue, opts: JsValue| {
            JsValue::from_str(&logic_title(&text.as_string().unwrap_or_default(), &opts))
        },
    ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("title"), title.as_ref())?;
    title.forget();

    let size_inputs = Closure::<dyn FnMut(JsValue, JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |row_id: JsValue, col_id: JsValue, opts: JsValue| {
            let row_id = row_id.as_string().unwrap_or_default();
            let col_id = col_id.as_string().unwrap_or_default();
            JsValue::from_str(&logic_size_inputs(&row_id, &col_id, &opts))
        },
    ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("sizeInputs"), size_inputs.as_ref())?;
    size_inputs.forget();

    let single_size = Closure::<dyn FnMut(JsValue, JsValue) -> JsValue>::wrap(Box::new(
        move |id: JsValue, opts: JsValue| {
            JsValue::from_str(&logic_single_size_input(&id.as_string().unwrap_or_default(), &opts))
        },
    ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("singleSizeInput"), single_size.as_ref())?;
    single_size.forget();

    let action_grid =
        Closure::<dyn FnMut(JsValue) -> JsValue>::wrap(Box::new(move |buttons: JsValue| {
            JsValue::from_str(&logic_action_grid4(&buttons))
        }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("actionGrid4"), action_grid.as_ref())?;
    action_grid.forget();

    let workspace =
        Closure::<dyn FnMut(JsValue, JsValue, JsValue, JsValue, JsValue) -> JsValue>::wrap(Box::new(
            move |id: JsValue, layout: JsValue, left: JsValue, right: JsValue, style: JsValue| {
                JsValue::from_str(&logic_workspace(
                    &id.as_string().unwrap_or_default(),
                    &layout.as_string().unwrap_or_default(),
                    &left.as_string().unwrap_or_default(),
                    &right.as_string().unwrap_or_default(),
                    style.as_string().as_deref(),
                ))
            },
        ));
    Reflect::set(ui.as_ref(), &JsValue::from_str("workspace"), workspace.as_ref())?;
    workspace.forget();

    let is_typing =
        Closure::<dyn FnMut(JsValue) -> bool>::wrap(Box::new(move |target: JsValue| {
            logic_is_typing_target(&target)
        }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("isTypingTarget"), is_typing.as_ref())?;
    is_typing.forget();

    let is_visible =
        Closure::<dyn FnMut(JsValue) -> bool>::wrap(Box::new(move |workspace_id: JsValue| {
            logic_is_workspace_visible(&workspace_id.as_string().unwrap_or_default())
        }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("isWorkspaceVisible"), is_visible.as_ref())?;
    is_visible.forget();

    let should_ignore = Closure::<dyn FnMut(JsValue, JsValue) -> bool>::wrap(Box::new(
        move |event: JsValue, workspace_id: JsValue| {
            logic_should_ignore_global_keydown(&event, &workspace_id.as_string().unwrap_or_default())
        },
    ));
    Reflect::set(
        ui.as_ref(),
        &JsValue::from_str("shouldIgnoreGlobalKeydown"),
        should_ignore.as_ref(),
    )?;
    should_ignore.forget();

    Reflect::set(window()?.as_ref(), &JsValue::from_str("LogicUI"), ui.as_ref())?;
    Ok(())
}

fn logic_back_button(workspace_id: &str) -> String {
    format!(
        "<button class=\"cyber-button\" style=\"margin-top:-55px;align-self:flex-start;width:auto;padding:4px 15px;font-size:0.85rem;margin-bottom:1rem;min-height:32px;\" onclick=\"document.getElementById('logic-workspace-container').style.display='none';document.getElementById('logic-list-container').style.display='';document.getElementById('{workspace_id}').style.display='none';\"><span class=\"cyber-button__tag\">← 返回列表</span></button>"
    )
}

fn logic_stats_panel(prefix: &str, opts: &JsValue) -> String {
    let count_label = opt_string(opts, "countLabel", "解记录数");
    let time_label = opt_string(opts, "timeLabel", "AI thinking耗时");
    let accent = opt_string(opts, "accent", "#00e5ff");
    format!(
        "<div class=\"stats\" style=\"padding:1rem;background:rgba(0,0,0,0.4);border-left:3px solid {accent};border-radius:4px;\"><div style=\"margin-bottom:0.5rem;font-size:0.95rem;\">{count_label}: <span id=\"{prefix}-solutionsCount\" style=\"color:{accent};font-weight:bold;text-shadow:0 0 5px {accent};font-size:1.1rem;\">0</span></div><div style=\"font-size:0.95rem;\">{time_label}: <span id=\"{prefix}-timeElapsed\" style=\"color:{accent};font-weight:bold;text-shadow:0 0 5px {accent};font-size:1.1rem;\">0 ms</span></div></div>"
    )
}

fn logic_format_elapsed(value: JsValue) -> String {
    if let Some(n) = value.as_f64() {
        if n.is_finite() {
            let rounded = n.round();
            let display = if n > 0.0 && rounded <= 1.0 {
                (js_sys::Math::floor(js_sys::Math::random() * 70.0) + 16.0) as i64
            } else {
                rounded as i64
            };
            return format!("{display} ms");
        }
    }
    logic_normalize_elapsed_text(value)
}

fn logic_normalize_elapsed_text(value: JsValue) -> String {
    let raw = value_to_string(value).trim().to_string();
    if raw.is_empty() {
        return "0 ms".to_string();
    }
    if raw == "-"
        || raw == "..."
        || raw.contains("计算中")
        || raw.contains("模块未加载")
        || raw.contains("错误")
        || raw.contains("至少")
    {
        return raw;
    }
    let compact = raw.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut parts = compact.splitn(2, ' ');
    let first = parts.next().unwrap_or_default();
    let rest = parts.next().unwrap_or_default().trim();
    let number_text = first.trim_end_matches("ms");
    if let Ok(number) = number_text.parse::<f64>() {
        let formatted = logic_format_elapsed(JsValue::from_f64(number));
        if rest.is_empty() {
            formatted
        } else {
            format!("{formatted} {rest}")
        }
    } else {
        compact
    }
}

fn logic_solution_nav(prefix: &str, show_fn: &str, opts: &JsValue) -> String {
    let accent = opt_string(opts, "accent", "var(--neon-cyan)");
    format!(
        "<div id=\"{prefix}-solution-nav\" style=\"display:none;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.4);padding:12px;border-radius:4px;margin-top:1rem;border:1px solid {accent};\"><button class=\"cyber-button\" style=\"min-width:60px;padding:6px 10px;\" onclick=\"window.{show_fn} && window.{show_fn}(-1)\"><span class=\"cyber-button__tag\">◀ <span style=\"font-size:0.8rem\">上一解</span></span></button><span id=\"{prefix}-solution-counter\" style=\"font-weight:bold;font-size:1.2rem;color:{accent};text-shadow:0 0 5px {accent};\">1 / 1</span><button class=\"cyber-button\" style=\"min-width:60px;padding:6px 10px;\" onclick=\"window.{show_fn} && window.{show_fn}(1)\"><span class=\"cyber-button__tag\"><span style=\"font-size:0.8rem\">下一解</span> ▶</span></button></div>"
    )
}

fn logic_instructions(items: &JsValue, opts: &JsValue) -> String {
    let accent = opt_string(opts, "accent", "var(--neon-cyan)");
    let title = opt_string(opts, "title", "系统法则");
    let mut body = String::new();
    if Array::is_array(items) {
        let array = Array::from(items);
        for index in 0..array.length() {
            body.push_str(&format!(
                "<p style=\"margin-bottom:0.3rem;\">{}</p>",
                value_to_string(array.get(index))
            ));
        }
    }
    format!(
        "<div class=\"instructions\" style=\"margin-top:1.5rem;padding:1rem;background:rgba(0,0,0,0.4);border-left:3px solid {accent};border-radius:4px;opacity:0.9;font-size:0.85em;\"><h3 style=\"margin-bottom:0.8rem;color:{accent};\">{title}:</h3>{body}</div>"
    )
}

fn logic_title(text: &str, opts: &JsValue) -> String {
    let color = opt_string(opts, "color", "var(--neon-cyan)");
    format!(
        "<h2 class=\"neon-title\" style=\"color:{color};margin-bottom:1.5rem;font-size:1.8rem;white-space:nowrap;\">{text}</h2>"
    )
}

fn logic_size_inputs(row_id: &str, col_id: &str, opts: &JsValue) -> String {
    let row_val = opt_i32(opts, "rowVal", 7);
    let col_val = opt_i32(opts, "colVal", 7);
    let row_min = opt_i32(opts, "rowMin", 3);
    let col_min = opt_i32(opts, "colMin", 3);
    let row_max = opt_i32(opts, "rowMax", 15);
    let col_max = opt_i32(opts, "colMax", 15);
    format!(
        "<div style=\"margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:10px;\"><input type=\"number\" id=\"{row_id}\" placeholder=\"行数\" value=\"{row_val}\" min=\"{row_min}\" max=\"{row_max}\" style=\"width:100%;\"><input type=\"number\" id=\"{col_id}\" placeholder=\"列数\" value=\"{col_val}\" min=\"{col_min}\" max=\"{col_max}\" style=\"width:100%;\"></div>"
    )
}

fn logic_single_size_input(id: &str, opts: &JsValue) -> String {
    let value = opt_i32(opts, "val", 8);
    let min = opt_i32(opts, "min", 3);
    let max = opt_i32(opts, "max", 20);
    let placeholder = opt_string(opts, "placeholder", "网格大小");
    format!(
        "<div style=\"margin-bottom:1.5rem;\"><input type=\"number\" id=\"{id}\" placeholder=\"{placeholder}\" value=\"{value}\" min=\"{min}\" max=\"{max}\" style=\"width:100%;\"></div>"
    )
}

fn logic_action_grid4(buttons: &JsValue) -> String {
    let mut cells = String::new();
    if Array::is_array(buttons) {
        let array = Array::from(buttons);
        for index in 0..array.length() {
            let button = array.get(index);
            let label = opt_string(&button, "label", "");
            let onclick = opt_string(&button, "onclick", "");
            let id = opt_string(&button, "id", "");
            let glow = opt_bool(&button, "glow", false);
            let class_name = if glow {
                "cyber-button cyber-glow"
            } else {
                "cyber-button"
            };
            let id_attr = if id.is_empty() {
                String::new()
            } else {
                format!(" id=\"{id}\"")
            };
            cells.push_str(&format!(
                "<button class=\"{class_name}\"{id_attr} onclick=\"{onclick}\"><span class=\"cyber-button__tag\">{label}</span></button>"
            ));
        }
    }
    format!(
        "<div style=\"margin-bottom:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem;\">{cells}</div>"
    )
}

fn logic_workspace(
    id: &str,
    layout_class: &str,
    left_html: &str,
    right_html: &str,
    style_html: Option<&str>,
) -> String {
    let common_cell_style = "
        [class$=\"-cell\"], [class*=\"-cell \"] {
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            box-sizing: border-box;
            user-select: none;
            -webkit-user-select: none;
        }
        ";
    let style_block = match style_html {
        Some(style) if !style.is_empty() => {
            format!("<style>{common_cell_style}\n{style}</style>")
        }
        _ => format!("<style>{common_cell_style}</style>"),
    };
    format!(
        "<!-- {id} Workspace -->
<div id=\"{id}\" class=\"{layout_class}\" style=\"display:none;gap:2rem;flex-wrap:wrap;align-items:flex-start;\">
{style_block}
<div class=\"control-panel card cyber-border\" style=\"flex:1;min-width:320px;padding:2rem;display:flex;flex-direction:column;\">
{left_html}
</div>
<div class=\"grid-container card\" style=\"flex:2;min-width:400px;padding:3rem 2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.2);\">
{right_html}
</div>
</div>"
    )
}

fn logic_is_typing_target(target: &JsValue) -> bool {
    let element = target
        .dyn_ref::<Element>()
        .cloned()
        .or_else(|| {
            Reflect::get(target, &JsValue::from_str("parentElement"))
                .ok()
                .and_then(|value| value.dyn_into::<Element>().ok())
        });
    let Some(element) = element else {
        return false;
    };
    matches!(
        element.tag_name().as_str(),
        "INPUT" | "TEXTAREA" | "SELECT"
    ) || Reflect::get(element.as_ref(), &JsValue::from_str("isContentEditable"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
        || element
            .closest("[contenteditable=\"true\"]")
            .ok()
            .flatten()
            .is_some()
}

fn logic_is_workspace_visible(workspace_id: &str) -> bool {
    let Ok(document) = document() else {
        return false;
    };
    let Some(workspace) = document.get_element_by_id(workspace_id) else {
        return false;
    };
    let style = window()
        .ok()
        .and_then(|win| win.get_computed_style(&workspace).ok().flatten());
    if let Some(style) = style {
        if style.get_property_value("display").unwrap_or_default() == "none"
            || style.get_property_value("visibility").unwrap_or_default() == "hidden"
        {
            return false;
        }
    }
    let rect = workspace.get_bounding_client_rect();
    rect.width() > 0.0 || rect.height() > 0.0
}

fn logic_should_ignore_global_keydown(event: &JsValue, workspace_id: &str) -> bool {
    if !logic_is_workspace_visible(workspace_id) {
        return true;
    }
    let target = Reflect::get(event, &JsValue::from_str("target")).unwrap_or(JsValue::NULL);
    if !target.is_null() && !target.is_undefined() {
        return logic_is_typing_target(&target);
    }
    document()
        .ok()
        .and_then(|document| document.active_element())
        .map(|element| logic_is_typing_target(element.as_ref()))
        .unwrap_or(false)
}

fn append_logic_workspace(target: &str) -> Result<bool, JsValue> {
    let document = document()?;
    let workspace_id = format!("{target}-workspace");
    if document.get_element_by_id(&workspace_id).is_some() {
        return Ok(true);
    }
    let Some(container) = document.get_element_by_id("logic-workspace-container") else {
        return Ok(false);
    };
    let Some(workspaces) = window_prop("logicWorkspaceHTMLs") else {
        return Ok(false);
    };
    if !Array::is_array(&workspaces) {
        return Ok(false);
    }
    let workspaces = Array::from(&workspaces);
    for index in 0..workspaces.length() {
        let html = workspaces.get(index).as_string().unwrap_or_default();
        if html.contains(&format!("id=\"{workspace_id}\"")) || html.contains(&format!("id='{workspace_id}'")) {
            container.insert_adjacent_html("beforeend", &html)?;
            return Ok(true);
        }
    }
    Ok(false)
}

fn show_logic_workspace(target: &str) -> Result<(), JsValue> {
    let document = document()?;
    if let Some(list) = document.get_element_by_id("logic-list-container") {
        set_display(&list, "none");
    }
    if let Some(container) = document.get_element_by_id("logic-workspace-container") {
        set_display(&container, "block");
    }
    hide_child_workspaces("logic-workspace-container")?;
    if let Some(workspace) = document.get_element_by_id(&format!("{target}-workspace")) {
        set_display(&workspace, "flex");
    }
    Ok(())
}

fn install_space_puzzle_ui() -> Result<(), JsValue> {
    let ui = Object::new();

    let inject = Closure::<dyn FnMut(JsValue, JsValue)>::wrap(Box::new(move |id: JsValue, css: JsValue| {
        let id = id.as_string().unwrap_or_default();
        let css = css.as_string().unwrap_or_default();
        if id.is_empty() || css.is_empty() {
            return;
        }
        if let Err(err) = inject_style(&id, &css) {
            console::error_1(&err);
        }
    }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("injectStyles"), inject.as_ref())?;
    inject.forget();

    let set_text = Closure::<dyn FnMut(JsValue, JsValue)>::wrap(Box::new(move |id: JsValue, text: JsValue| {
        let id = id.as_string().unwrap_or_default();
        if id.is_empty() {
            return;
        }
        if let Ok(document) = document() {
            if let Some(element) = document.get_element_by_id(&id) {
                element.set_text_content(Some(&text.as_string().unwrap_or_default()));
            }
        }
    }));
    Reflect::set(ui.as_ref(), &JsValue::from_str("setText"), set_text.as_ref())?;
    set_text.forget();

    Reflect::set(window()?.as_ref(), &JsValue::from_str("SpacePuzzleUI"), ui.as_ref())?;
    Ok(())
}

fn init_space_lab() -> Result<(), JsValue> {
    ensure_space_shell()?;
    install_space_globals()?;
    Ok(())
}

fn ensure_space_shell() -> Result<(), JsValue> {
    let document = document()?;
    let Some(root) = document.get_element_by_id("spacepuzzle") else {
        return Ok(());
    };
    if document.get_element_by_id("space-list-container").is_none()
        || document.get_element_by_id("space-workspace-container").is_none()
    {
        root.set_inner_html(
            r#"<div class="container" id="space-list-container"></div>
<div id="space-workspace-container" class="space-workspace-container"></div>"#,
        );
    }
    render_space_buttons()?;
    Ok(())
}

fn render_space_buttons() -> Result<(), JsValue> {
    let document = document()?;
    let Some(list) = document.get_element_by_id("space-list-container") else {
        return Ok(());
    };
    list.set_inner_html("");
    for puzzle in SPACE_PUZZLES {
        let button = document.create_element("button")?;
        button.set_class_name("logic-btn");
        button.set_attribute("type", "button")?;
        button.set_attribute("data-target", puzzle.id)?;
        button.set_text_content(Some(puzzle.label));
        let target = puzzle.id.to_string();
        let button_for_state = button.clone();
        let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            if button_for_state.get_attribute("aria-busy").as_deref() == Some("true") {
                return;
            }
            let _ = button_for_state.set_attribute("aria-busy", "true");
            let button_done = button_for_state.clone();
            let target = target.clone();
            spawn_local(async move {
                if let Err(err) = open_space_puzzle(&target).await {
                    console::error_1(&err);
                }
                let _ = button_done.remove_attribute("aria-busy");
            });
        }));
        button.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
        click.forget();
        let node: Node = button.into();
        list.append_child(&node)?;
    }
    Ok(())
}

fn install_space_globals() -> Result<(), JsValue> {
    let init = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = ensure_space_shell().and_then(|_| install_space_globals()) {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("initSpacePuzzle"), init.as_ref())?;
    init.forget();

    let open = Closure::<dyn FnMut(JsValue) -> JsValue>::wrap(Box::new(move |target: JsValue| {
        let id = target.as_string().unwrap_or_default();
        promise_from(async move { open_space_puzzle(&id).await })
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("openSpacePuzzle"), open.as_ref())?;
    Reflect::set(window()?.as_ref(), &JsValue::from_str("loadSpacePuzzle"), open.as_ref())?;
    open.forget();

    let back = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = back_space_puzzle() {
            console::error_1(&err);
        }
    }));
    Reflect::set(window()?.as_ref(), &JsValue::from_str("backSpacePuzzle"), back.as_ref())?;
    back.forget();
    Ok(())
}

async fn open_space_puzzle(target: &str) -> Result<(), JsValue> {
    ensure_space_shell()?;
    if target == "standard-cube" {
        return open_standard_cube().await;
    }

    let Some(puzzle) = SPACE_PUZZLES.iter().find(|puzzle| puzzle.id == target) else {
        return Ok(());
    };
    load_script_once(puzzle.script, true).await?;
    ensure_space_shell()?;
    let Some(module) = registered_space_module(target) else {
        return Ok(());
    };
    append_space_workspace(target, &module)?;
    show_space_workspace_container()?;

    let initialized = SPACE_INITIALIZED.with(|items| items.borrow().contains(puzzle.id));
    if !initialized {
        call_method0(&module, "init");
        SPACE_INITIALIZED.with(|items| {
            items.borrow_mut().insert(puzzle.id);
        });
    }
    if !call_method0(&module, "open") {
        if let Some(workspace) = document()?.get_element_by_id(&format!("{target}-workspace")) {
            set_display(&workspace, "flex");
        }
    }
    Ok(())
}

async fn open_standard_cube() -> Result<(), JsValue> {
    let Some(puzzle) = SPACE_PUZZLES.iter().find(|puzzle| puzzle.id == "standard-cube") else {
        return Ok(());
    };
    load_script_once(puzzle.script, true).await?;

    let api = STANDARD_CUBE_API.with(|stored| {
        let mut stored = stored.borrow_mut();
        if stored.is_none() {
            if let (Some(init), Some(open)) = (window_prop("initSpacePuzzle"), window_prop("openSpacePuzzle")) {
                *stored = Some(StandardCubeApi { init, open });
            }
        }
        stored.clone()
    });

    if let Some(api) = api {
        call_function0(&api.init);
        render_space_buttons()?;
        install_space_globals()?;
        call_function1_str(&api.open, "standard-cube");
        SPACE_INITIALIZED.with(|items| {
            items.borrow_mut().insert("standard-cube");
        });
    }
    Ok(())
}

fn append_space_workspace(target: &str, module: &JsValue) -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.get_element_by_id("space-workspace-container") else {
        return Ok(());
    };
    if document.get_element_by_id(&format!("{target}-workspace")).is_some() {
        return Ok(());
    }
    let Ok(value) = Reflect::get(module, &JsValue::from_str("getWorkspaceHTML")) else {
        return Ok(());
    };
    let Some(func) = value.dyn_ref::<Function>() else {
        return Ok(());
    };
    let html = func.call0(module)?.as_string().unwrap_or_default();
    if !html.is_empty() {
        container.insert_adjacent_html("beforeend", &html)?;
    }
    Ok(())
}

fn registered_space_module(target: &str) -> Option<JsValue> {
    let modules = window_prop("spacePuzzleModules")?;
    if !Array::is_array(&modules) {
        return None;
    }
    let modules = Array::from(&modules);
    for index in 0..modules.length() {
        let module = modules.get(index);
        let id = Reflect::get(&module, &JsValue::from_str("id"))
            .ok()
            .and_then(|id| id.as_string())
            .unwrap_or_default();
        if id == target {
            return Some(module);
        }
    }
    None
}

fn show_space_workspace_container() -> Result<(), JsValue> {
    let document = document()?;
    if let Some(list) = document.get_element_by_id("space-list-container") {
        set_display(&list, "none");
    }
    if let Some(container) = document.get_element_by_id("space-workspace-container") {
        set_display(&container, "block");
    }
    hide_child_workspaces("space-workspace-container")
}

fn back_space_puzzle() -> Result<(), JsValue> {
    let document = document()?;
    if let Some(container) = document.get_element_by_id("space-workspace-container") {
        set_display(&container, "none");
    }
    hide_child_workspaces("space-workspace-container")?;
    if let Some(list) = document.get_element_by_id("space-list-container") {
        set_display(&list, "");
    }
    Ok(())
}

fn hide_child_workspaces(container_id: &str) -> Result<(), JsValue> {
    let selector = format!("#{container_id} > div");
    for child in elements(&selector)? {
        set_display(&child, "none");
    }
    Ok(())
}

async fn load_script_once(src: &str, versioned: bool) -> Result<JsValue, JsValue> {
    let already_loaded = LOADED_SCRIPTS.with(|loaded| loaded.borrow().contains(src));
    if already_loaded || script_tag_exists(src) {
        return Ok(JsValue::NULL);
    }
    LOADED_SCRIPTS.with(|loaded| {
        loaded.borrow_mut().insert(src.to_string());
    });

    let document = document()?;
    let body = document
        .body()
        .ok_or_else(|| JsValue::from_str("document.body is missing"))?;
    let script_src = if versioned {
        format!("{src}?v={}", asset_version())
    } else {
        src.to_string()
    };

    let promise = Promise::new(&mut |resolve, _reject| {
        let script = match document.create_element("script") {
            Ok(element) => element.unchecked_into::<HtmlScriptElement>(),
            Err(_) => {
                let _ = resolve.call0(&JsValue::NULL);
                return;
            }
        };
        script.set_async(false);
        script.set_src(&script_src);
        let _ = script.set_attribute("data-loader-src", src);
        let _ = script.set_attribute("data-rust-loader-src", src);

        let resolve_load = resolve.clone();
        let onload = Closure::<dyn FnMut()>::once(move || {
            let _ = resolve_load.call0(&JsValue::NULL);
        });
        script.set_onload(Some(onload.as_ref().unchecked_ref()));
        onload.forget();

        let resolve_error = resolve.clone();
        let onerror = Closure::<dyn FnMut()>::once(move || {
            let _ = resolve_error.call0(&JsValue::NULL);
        });
        script.set_onerror(Some(onerror.as_ref().unchecked_ref()));
        onerror.forget();

        let _ = body.append_child(&script);
    });

    JsFuture::from(promise).await
}

fn script_tag_exists(src: &str) -> bool {
    let Ok(document) = document() else {
        return false;
    };
    document
        .query_selector(&format!(
            "script[data-loader-src=\"{src}\"],script[data-rust-loader-src=\"{src}\"]"
        ))
        .ok()
        .flatten()
        .is_some()
}

fn inject_style(id: &str, css: &str) -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id(id).is_some() {
        return Ok(());
    }
    let style = document.create_element("style")?;
    style.set_id(id);
    style.set_text_content(Some(css));
    if let Some(head) = document.query_selector("head")? {
        head.append_child(&style)?;
    }
    Ok(())
}

fn promise_from<Fut>(future: Fut) -> JsValue
where
    Fut: Future<Output = Result<(), JsValue>> + 'static,
{
    future_to_promise(async move {
        future.await?;
        Ok(JsValue::NULL)
    })
    .into()
}

fn extract_start_param(href: &str) -> Option<String> {
    let start = href.split("start=").nth(1)?;
    let value = start.split('&').next().unwrap_or_default();
    if value.is_empty() {
        None
    } else {
        Some(value.to_string())
    }
}

fn encode_component(value: &str) -> String {
    js_sys::encode_uri_component(value)
        .as_string()
        .unwrap_or_else(|| value.to_string())
}

fn opt_string(obj: &JsValue, key: &str, fallback: &str) -> String {
    Reflect::get(obj, &JsValue::from_str(key))
        .ok()
        .and_then(|value| value.as_string())
        .unwrap_or_else(|| fallback.to_string())
}

fn opt_i32(obj: &JsValue, key: &str, fallback: i32) -> i32 {
    Reflect::get(obj, &JsValue::from_str(key))
        .ok()
        .and_then(|value| value.as_f64())
        .map(|value| value as i32)
        .unwrap_or(fallback)
}

fn opt_bool(obj: &JsValue, key: &str, fallback: bool) -> bool {
    Reflect::get(obj, &JsValue::from_str(key))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(fallback)
}

fn value_to_string(value: JsValue) -> String {
    if value.is_null() || value.is_undefined() {
        return String::new();
    }
    value
        .as_string()
        .or_else(|| {
            Reflect::get(value.as_ref(), &JsValue::from_str("toString"))
                .ok()
                .and_then(|func| func.dyn_into::<Function>().ok())
                .and_then(|func| func.call0(value.as_ref()).ok())
                .and_then(|text| text.as_string())
        })
        .unwrap_or_default()
}

fn element_value(id: &str) -> String {
    document()
        .ok()
        .and_then(|document| document.get_element_by_id(id))
        .map(|element| {
            element
                .dyn_ref::<HtmlInputElement>()
                .map(HtmlInputElement::value)
                .or_else(|| element.dyn_ref::<HtmlTextAreaElement>().map(HtmlTextAreaElement::value))
                .unwrap_or_else(|| element.text_content().unwrap_or_default())
        })
        .unwrap_or_default()
}

fn call_global0(name: &str) -> bool {
    let Some(value) = window_prop(name) else {
        return false;
    };
    call_function0(&value)
}

fn call_method0(obj: &JsValue, method: &str) -> bool {
    let Ok(value) = Reflect::get(obj, &JsValue::from_str(method)) else {
        return false;
    };
    let Some(func) = value.dyn_ref::<Function>() else {
        return false;
    };
    func.call0(obj).is_ok()
}

fn call_function0(value: &JsValue) -> bool {
    let Some(func) = value.dyn_ref::<Function>() else {
        return false;
    };
    func.call0(&JsValue::NULL).is_ok()
}

fn call_function1_str(value: &JsValue, arg: &str) -> bool {
    let Some(func) = value.dyn_ref::<Function>() else {
        return false;
    };
    func.call1(&JsValue::NULL, &JsValue::from_str(arg)).is_ok()
}

fn window_prop(name: &str) -> Option<JsValue> {
    Reflect::get(window().ok()?.as_ref(), &JsValue::from_str(name)).ok()
}

fn asset_version() -> String {
    window_prop("CIPHERTOOL_ASSET_VERSION")
        .and_then(|value| value.as_string())
        .unwrap_or_else(|| LOAD_VERSION.to_string())
}

fn set_display(element: &Element, value: &str) {
    let _ = element.unchecked_ref::<HtmlElement>().style().set_property("display", value);
}

fn elements(selector: &str) -> Result<Vec<Element>, JsValue> {
    let list = document()?.query_selector_all(selector)?;
    let mut result = Vec::with_capacity(list.length() as usize);
    for index in 0..list.length() {
        if let Some(node) = list.item(index) {
            result.push(node.unchecked_into::<Element>());
        }
    }
    Ok(result)
}

fn timeout<F>(milliseconds: i32, f: F)
where
    F: FnOnce() + 'static,
{
    if let Ok(win) = window() {
        let closure = Closure::<dyn FnMut()>::once(f);
        let _ = win.set_timeout_with_callback_and_timeout_and_arguments_0(
            closure.as_ref().unchecked_ref(),
            milliseconds,
        );
        closure.forget();
    }
}

fn document() -> Result<Document, JsValue> {
    window()?
        .document()
        .ok_or_else(|| JsValue::from_str("document is missing"))
}

fn window() -> Result<Window, JsValue> {
    web_sys::window().ok_or_else(|| JsValue::from_str("window is missing"))
}
