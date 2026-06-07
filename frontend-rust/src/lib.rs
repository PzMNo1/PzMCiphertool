mod cipher;
mod lab;
mod templates;

use std::cell::{Cell, RefCell};
use std::rc::Rc;

use js_sys::{Function, Promise, Reflect};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{spawn_local, JsFuture};
use web_sys::{
    console, Document, Element, Event, HtmlElement, HtmlIFrameElement, HtmlImageElement,
    HtmlInputElement, HtmlScriptElement, KeyboardEvent, Node, ScrollBehavior,
    ScrollToOptions, Window,
};

const BODY_HTML: &str = include_str!("body.html");
const CIPHER_CLASSIC_MODERN_HTML: &str = include_str!("templates/cipher_classic_modern.html");
const LOAD_VERSION: &str = "20260531";

const CORE_SCRIPTS: &[&str] = &[
    "./electronic/electronic_lab.js",
    "./apizhongzhuanzhan/apizhongzhuanzhan.js",
    "./apizhongzhuanzhan/apizz-overview.js",
    "./apizhongzhuanzhan/apizz-keys.js",
    "./apizhongzhuanzhan/apizz-usage.js",
    "./apizhongzhuanzhan/apizz-billing.js",
    "./apizhongzhuanzhan/apizz-ops.js",
    "./mcpskilllab/mcpskilllab-config.js",
    "./mcpskilllab/mcpskilllab-resources-mcp.js",
    "./mcpskilllab/mcpskilllab-resources-skills.js",
    "./mcpskilllab/mcpskilllab-resources.js",
    "./mcpskilllab/mcpskilllab.js",
    "./model/contracts/AgentContract.js",
    "./model/DeepSeekClient.js",
    "./model/ToolRegistry.js",
    "./model/ChatUI.js",
    "./model/HistoryManager.js",
    "./model/agent/AgentIntentContract.js",
    "./model/agent/AgentProfiles.js",
    "./model/agent/AgentPolicyResolver.js",
    "./model/agent/ResearchPlan.js",
    "./model/agent/SourceLibrary.js",
    "./model/agent/ToolRiskPolicy.js",
    "./model/agent/EvidenceLedger.js",
    "./model/agent/CitationNormalizer.js",
    "./model/agent/CitationVerifier.js",
    "./model/AgentRuntime.js",
    "./model/main.js",
    "./workflow/workflow.js",
    "./zhishitupu/graphData.js",
    "./zhishitupu/zhishitupu.js",
    "./sendfeedback/sendfeedback.js",
];

thread_local! {
    static TABSETS: RefCell<Vec<Rc<TabSetState>>> = RefCell::new(Vec::new());
    static GUIDE_STATE: RefCell<GuideState> = RefCell::new(GuideState {
        active_id: None,
        active_index: 0,
        active_target: None,
    });
}

struct TabSetState {
    context_id: String,
    container: Element,
    slides: Vec<Element>,
    buttons: Vec<Element>,
    current_index: Cell<usize>,
}

struct GuideState {
    active_id: Option<&'static str>,
    active_index: usize,
    active_target: Option<Element>,
}

struct GuideSet {
    id: &'static str,
    label: &'static str,
    steps: &'static [GuideStep],
}

struct GuideStep {
    selector: &'static str,
    title: &'static str,
    body: &'static str,
}

const GUIDE_MIMAQU_STEPS: &[GuideStep] = &[
    GuideStep {
        selector: "#mimaqu #mainInput",
        title: "先输入待处理文本",
        body: "在这里输入明文或密文。经典区和现代区的主输入框会同步，输入后下方所有相关卡片会自动计算。",
    },
    GuideStep {
        selector: "#quick-nav-container-mimaqu",
        title: "用搜索框快速定位卡片",
        body: "输入“凯撒”“摩尔斯”“栅栏”等关键词，可以直接跳到对应密码卡片，适合卡片较多时快速找工具。",
    },
    GuideStep {
        selector: "#caesarShift",
        title: "调整卡片参数",
        body: "部分密码卡片有独立参数，例如凯撒偏移量、栅栏层数、维吉尼亚密钥。参数变化后结果会立即刷新。",
    },
    GuideStep {
        selector: "#caesarResult",
        title: "查看加密和解密结果",
        body: "结果区域通常会同时显示加密和解密。你可以直接选中复制，也可以继续改输入或参数进行比对。",
    },
    GuideStep {
        selector: "#mimaqu .pin-toggle-btn",
        title: "必要时置顶输入框",
        body: "点击“置顶”可以把主输入框固定在页面上方，方便你在长页面里一边滚动一边调整文本。",
    },
];

const GUIDE_XIANDAIQU_STEPS: &[GuideStep] = &[
    GuideStep {
        selector: "#xiandaiqu #mainInput",
        title: "现代区同样从主输入开始",
        body: "这里主要处理哈希、HMAC 和 Enigma 等现代或复杂工具。输入框会和经典区保持同步。",
    },
    GuideStep {
        selector: "#MD5Key",
        title: "HMAC 需要填写密钥",
        body: "MD5、SHA 系列卡片的密钥输入框用于生成 HMAC。只想看普通哈希时，关注结果里的哈希值即可。",
    },
    GuideStep {
        selector: "#enigmaModel",
        title: "Enigma 先选择机型",
        body: "选择机型后，转子、反射器、环位和插板配置会参与计算。修改任一配置都会重新生成结果。",
    },
    GuideStep {
        selector: "#quick-nav-container-xiandaiqu",
        title: "现代区也支持快速搜索",
        body: "如果页面较长，直接搜索“SHA”或“Enigma”就能定位对应卡片。",
    },
];

const GUIDE_ZHISHITUPU_STEPS: &[GuideStep] = &[
    GuideStep {
        selector: "#hud-panel",
        title: "先看右下角操作面板",
        body: "这里列出知识图谱的基础手势：左键拖拽旋转，右键拖拽平移，滚轮缩放，点击节点聚焦。",
    },
    GuideStep {
        selector: "#graph-wrapper",
        title: "在图谱画布中浏览节点",
        body: "拖动和缩放可以观察整体关系。点击任意节点会让镜头聚焦到该节点，并根据当前阅览模式打开对应内容。",
    },
    GuideStep {
        selector: "#zstp-import-btn",
        title: "导入项目生成图谱",
        body: "点击“项目导入”后选择本地项目文件夹，图谱会替换为该项目的目录和文件关系。文件只在浏览器本地读取。",
    },
    GuideStep {
        selector: "#zstp-mode-switch",
        title: "切换节点点击后的阅览方式",
        body: "阅览代码会预览代码文件，阅览文档会预览文档文件，模型解释会把节点交给右下角 Agent 进行说明。",
    },
    GuideStep {
        selector: "#cardSearch",
        title: "也可以用侧边栏搜索节点",
        body: "在左侧搜索框输入节点名、文件名或路径关键词并回车，知识图谱会尝试聚焦匹配节点。",
    },
];

const GUIDE_SETS: &[GuideSet] = &[
    GuideSet {
        id: "mimaqu",
        label: "经典区使用说明",
        steps: GUIDE_MIMAQU_STEPS,
    },
    GuideSet {
        id: "xiandaiqu",
        label: "现代区使用说明",
        steps: GUIDE_XIANDAIQU_STEPS,
    },
    GuideSet {
        id: "zhishitupu",
        label: "知识图谱使用说明",
        steps: GUIDE_ZHISHITUPU_STEPS,
    },
];

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
    if let Err(err) = install_body().and_then(|_| install_global_helpers()) {
        console::error_1(&err);
        return;
    }
    spawn_local(async {
        if let Err(err) = boot().await {
            console::error_1(&err);
        }
    });
}

async fn boot() -> Result<(), JsValue> {
    let _ = load_script("./backendconfig.js", false).await;
    let _ = load_script("./loginsystem/auth.js", false).await;

    render_modules()?;
    cipher::classic::init()?;
    init_sidebar_interactions()?;
    init_tabs()?;
    init_keyboard_navigation()?;
    init_search_function()?;
    init_pin_toggle()?;
    init_mobile_height()?;
    init_author_page()?;
    init_usage_guide()?;
    lab::init()?;
    show_module("jiamishiyanshi")?;

    let core = load_scripts(CORE_SCRIPTS).await;
    let _ = core;
    init_loaded_modules()?;

    Ok(())
}

fn install_body() -> Result<(), JsValue> {
    let document = document()?;
    let body = document
        .body()
        .ok_or_else(|| JsValue::from_str("document.body is missing"))?;
    body.set_inner_html(BODY_HTML);
    Ok(())
}

fn render_modules() -> Result<(), JsValue> {
    let document = document()?;

    for id in templates::MODULE_IDS {
        let Some(template) = templates::module_template(id) else {
            continue;
        };
        if let Some(container) = document.get_element_by_id(&format!("{id}-container")) {
            let html = template.replace("{{CIPHER_CLASSIC_MODERN_HTML}}", CIPHER_CLASSIC_MODERN_HTML);
            container.set_inner_html(&html);
        }
    }

    Ok(())
}

fn install_global_helpers() -> Result<(), JsValue> {
    let win = window()?;

    let load_lazy = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |root: JsValue| {
        let root_element = root.dyn_into::<Element>().ok();
        if let Err(err) = load_lazy_images(root_element.as_ref()) {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("loadLazyImages"),
        load_lazy.as_ref(),
    )?;
    load_lazy.forget();

    let highlight = Closure::<dyn FnMut(JsValue)>::wrap(Box::new(move |target: JsValue| {
        if let Ok(element) = target.dyn_into::<Element>() {
            if let Err(err) = highlight_and_scroll(&element) {
                console::error_1(&err);
            }
        }
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("highlightAndScroll"),
        highlight.as_ref(),
    )?;
    highlight.forget();

    let init_search = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_search_function() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("initSearchFunction"),
        init_search.as_ref(),
    )?;
    init_search.forget();

    let init_author = Closure::<dyn FnMut()>::wrap(Box::new(move || {
        if let Err(err) = init_author_page() {
            console::error_1(&err);
        }
    }));
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("initAuthorPage"),
        init_author.as_ref(),
    )?;
    init_author.forget();

    Ok(())
}

async fn load_scripts(list: &[&str]) {
    let mut promises = Vec::with_capacity(list.len());
    for src in list {
        promises.push(load_script(src, true));
    }
    for promise in promises {
        let _ = promise.await;
    }
}

async fn load_script(src: &str, versioned: bool) -> Result<JsValue, JsValue> {
    let document = document()?;
    let body = document
        .body()
        .ok_or_else(|| JsValue::from_str("document.body is missing"))?;
    let src = if versioned {
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
        script.set_src(&src);

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

fn init_loaded_modules() -> Result<(), JsValue> {
    call_global0("initSearchFunction");
    call_global0("initApiZhongZhuanZhan");
    call_global0("initMcpSkillLab");
    call_global0("initSendFeedback");
    call_global0("initChatFunctions");
    call_global0("initWorkflowCoze");
    call_global0("initElectronicLab");
    call_global0("initAuthorPage");
    Ok(())
}

fn init_sidebar_interactions() -> Result<(), JsValue> {
    let document = document()?;

    if let (Some(sidebar), Some(pin_btn)) = (
        document.get_element_by_id("sidebar"),
        document.get_element_by_id("sidebar-pin-btn"),
    ) {
        let sidebar_clone = sidebar.clone();
        let pin_btn_clone = pin_btn.clone();
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            event.stop_propagation();
            let pinned = sidebar_clone
                .class_list()
                .toggle("sidebar-pinned")
                .unwrap_or(false);
            let _ = pin_btn_clone.set_attribute("aria-pressed", &pinned.to_string());
        }));
        pin_btn.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }

    for item in elements(".menu-item")? {
        let target = item.get_attribute("data-target").unwrap_or_default();
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            if let Err(err) = show_module(&target) {
                console::error_1(&err);
            }
        }));
        item.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }

    Ok(())
}

fn show_module(id: &str) -> Result<(), JsValue> {
    if let Some(zstp) = window_prop("ZSTP") {
        if id == "zhishitupu" {
            call_method0(&zstp, "resume");
        } else {
            call_method0(&zstp, "pause");
        }
    }

    for element in elements(".container1 > div")? {
        set_display(&element, "none");
    }

    let document = document()?;
    if let Some(target_container) = document.get_element_by_id(&format!("{id}-container")) {
        set_display(&target_container, "block");
        load_lazy_images(Some(&target_container))?;
    }

    for section in elements(".content-section")? {
        set_display(&section, "none");
    }

    if let Some(section) = document.get_element_by_id(&format!("{id}-content")) {
        set_display(&section, if id == "workflow" { "flex" } else { "block" });
    }

    if id == "electroniclab" {
        if let Some(frame) = document.get_element_by_id("circuit-frame") {
            let frame: HtmlIFrameElement = frame.unchecked_into();
            if frame.get_attribute("src").unwrap_or_default().is_empty() {
                if let Some(loading) = document.get_element_by_id("circuit-loading") {
                    let _ = loading.class_list().add_1("active");
                }
                if let Some(src) = frame.get_attribute("data-src") {
                    frame.set_src(&src);
                }
            }
        }
    }

    for item in elements(".menu-item")? {
        let active = item.get_attribute("data-target").as_deref() == Some(id);
        item.class_list().toggle_with_force("active", active)?;
    }

    match id {
        "zhishitupu" => timeout(50, || {
            dispatch_resize();
            call_global0("initKnowledgeGraph");
        }),
        "workflow" => timeout(50, dispatch_resize),
        "damoxing" => {
            if !call_global0("initChatFunctions") {
                call_global0("bindChatEvents");
            }
        }
        "apizhongzhuanzhan" => {
            call_global0("initApiZhongZhuanZhan");
        }
        "mcpskilllab" => {
            call_global0("initMcpSkillLab");
        }
        _ => {}
    }

    Ok(())
}

fn init_tabs() -> Result<(), JsValue> {
    TABSETS.with(|sets| sets.borrow_mut().clear());
    create_tab_set(
        "#jiamishiyanshi-content .cipher-lab-panel-stack",
        "#jiamishiyanshi-content .submodule",
        "#jiamishiyanshi-content .submodule-btn",
        "jiamishiyanshi-content",
    )?;
    create_tab_set(
        "#yijianfankui-content .cipher-lab-panel-stack",
        "#yijianfankui-content .lianxiwomen-submodule",
        "#yijianfankui-content .contact-submodule-btn",
        "yijianfankui-content",
    )?;
    Ok(())
}

fn create_tab_set(
    container_selector: &str,
    slide_selector: &str,
    button_selector: &str,
    context_id: &str,
) -> Result<(), JsValue> {
    let document = document()?;
    let Some(container) = document.query_selector(container_selector)? else {
        return Ok(());
    };
    let slides = elements(slide_selector)?;
    if slides.is_empty() {
        return Ok(());
    }
    let buttons = elements(button_selector)?;
    let active_index = slides
        .iter()
        .position(|slide| slide.class_list().contains("active"))
        .unwrap_or(0);

    let state = Rc::new(TabSetState {
        context_id: context_id.to_string(),
        container,
        slides,
        buttons,
        current_index: Cell::new(active_index),
    });

    for (index, button) in state.buttons.iter().enumerate() {
        let state_clone = state.clone();
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.prevent_default();
            if let Err(err) = tab_slide_to(&state_clone, index) {
                console::error_1(&err);
            }
        }));
        button.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }

    tab_slide_to(&state, active_index)?;
    TABSETS.with(|sets| sets.borrow_mut().push(state));
    Ok(())
}

fn tab_slide_to(state: &Rc<TabSetState>, index: usize) -> Result<(), JsValue> {
    if state.slides.is_empty() {
        return Ok(());
    }
    let index = index.min(state.slides.len() - 1);
    state.current_index.set(index);

    for (button_index, button) in state.buttons.iter().enumerate() {
        button
            .class_list()
            .toggle_with_force("active", button_index == index)?;
    }
    for (slide_index, slide) in state.slides.iter().enumerate() {
        slide
            .class_list()
            .toggle_with_force("active", slide_index == index)?;
    }

    if state.context_id == "jiamishiyanshi-content" {
        call_global0("scheduleUpdateAll");
        if state
            .slides
            .get(index)
            .map(Element::id)
            .as_deref()
            == Some("xiandaiqu")
        {
            request_animation_frame(|| {
                call_global0("processEnigma");
            });
        }
    }

    request_animation_frame(dispatch_resize);
    Ok(())
}

fn init_keyboard_navigation() -> Result<(), JsValue> {
    let closure = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        if let Ok(document) = document() {
            if let Some(active) = document.active_element() {
                let tag = active.tag_name();
                if tag == "INPUT" || tag == "TEXTAREA" {
                    return;
                }
            }
        }

        let key = event.key();
        if key != "ArrowLeft" && key != "ArrowRight" {
            return;
        }

        let Some(active_section_id) = visible_content_section_id().ok().flatten() else {
            return;
        };

        TABSETS.with(|sets| {
            for state in sets.borrow().iter() {
                if state.context_id != active_section_id {
                    continue;
                }
                let current = state.current_index.get();
                let next = if key == "ArrowLeft" {
                    current.saturating_sub(1)
                } else {
                    (current + 1).min(state.slides.len().saturating_sub(1))
                };
                if next != current {
                    if let Err(err) = tab_slide_to(state, next) {
                        console::error_1(&err);
                    }
                }
            }
        });
    }));
    document()?.add_event_listener_with_callback("keydown", closure.as_ref().unchecked_ref())?;
    closure.forget();
    Ok(())
}

fn init_search_function() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(
        document.as_ref(),
        &JsValue::from_str("__rustSearchFunctionReady"),
    )
    .ok()
    .and_then(|v| v.as_bool())
    .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustSearchFunctionReady"),
        &JsValue::TRUE,
    )?;

    if let Some(card_search) = document.get_element_by_id("cardSearch") {
        let input: HtmlInputElement = card_search.unchecked_into();
        let input_for_event = input.clone();
        let closure = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
            if event.key() != "Enter" {
                return;
            }
            event.prevent_default();
            let query = input_for_event.value().trim().to_string();
            if is_knowledge_graph_visible() {
                focus_knowledge_graph_node(&query);
                return;
            }
            if let Some(target) = find_search_target(&query) {
                if let Err(err) = highlight_and_scroll(&target) {
                    console::error_1(&err);
                }
            }
        }));
        input.add_event_listener_with_callback("keydown", closure.as_ref().unchecked_ref())?;
        closure.forget();
    }

    init_quick_nav("mimaqu")?;
    init_quick_nav("xiandaiqu")?;
    init_cipher_sticky_input_mask()?;
    Ok(())
}

fn init_quick_nav(region_id: &str) -> Result<(), JsValue> {
    let doc = document()?;
    let Some(input_el) = doc.get_element_by_id(&format!("quick-nav-input-{region_id}")) else {
        return Ok(());
    };
    if Reflect::get(input_el.as_ref(), &JsValue::from_str("__rustQuickNavReady"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        input_el.as_ref(),
        &JsValue::from_str("__rustQuickNavReady"),
        &JsValue::TRUE,
    )?;

    let input: HtmlInputElement = input_el.unchecked_into();
    let list_id = format!("quick-nav-options-{region_id}");
    let container_id = format!("quick-nav-container-{region_id}");
    let region = region_id.to_string();

    let focus_input = input.clone();
    let focus_list = list_id.clone();
    let focus_region = region.clone();
    let focus = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        let _ = render_quick_nav_options(&focus_region, &focus_list, &focus_input.value());
        if let Ok(document) = document() {
            if let Some(list) = document.get_element_by_id(&focus_list) {
                let _ = list.class_list().add_1("show");
            }
        }
    }));
    input.add_event_listener_with_callback("focus", focus.as_ref().unchecked_ref())?;
    focus.forget();

    let input_input = input.clone();
    let input_list = list_id.clone();
    let input_region = region.clone();
    let input_handler = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        let _ = render_quick_nav_options(&input_region, &input_list, &input_input.value());
        if let Ok(document) = document() {
            if let Some(list) = document.get_element_by_id(&input_list) {
                let _ = list.class_list().add_1("show");
            }
        }
    }));
    input.add_event_listener_with_callback("input", input_handler.as_ref().unchecked_ref())?;
    input_handler.forget();

    let key_input = input.clone();
    let key_list = list_id.clone();
    let key_region = region.clone();
    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        if event.key() != "Enter" {
            return;
        }
        event.prevent_default();
        let filter_text = key_input.value().trim().to_lowercase();
        if filter_text.is_empty() {
            return;
        }
        if let Some((_, element)) = card_options(&key_region)
            .into_iter()
            .find(|(text, _)| text.to_lowercase().contains(&filter_text))
        {
            let _ = key_input.blur();
            if let Ok(document) = document() {
                if let Some(list) = document.get_element_by_id(&key_list) {
                    let _ = list.class_list().remove_1("show");
                }
            }
            let _ = highlight_and_scroll(&element);
        }
    }));
    input.add_event_listener_with_callback("keydown", keydown.as_ref().unchecked_ref())?;
    keydown.forget();

    let hide_list = list_id.clone();
    let hide_container = container_id.clone();
    let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        let inside = event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
            .and_then(|target| target.closest(&format!("#{hide_container}")).ok().flatten())
            .is_some();
        if !inside {
            if let Ok(document) = document() {
                if let Some(list) = document.get_element_by_id(&hide_list) {
                    let _ = list.class_list().remove_1("show");
                }
            }
        }
    }));
    doc.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
    click.forget();

    Ok(())
}

fn render_quick_nav_options(region_id: &str, list_id: &str, filter_text: &str) -> Result<(), JsValue> {
    let document = document()?;
    let Some(list) = document.get_element_by_id(list_id) else {
        return Ok(());
    };
    list.set_inner_html("");

    let filter_lower = filter_text.to_lowercase();
    let filtered: Vec<_> = card_options(region_id)
        .into_iter()
        .filter(|(text, _)| text.to_lowercase().contains(&filter_lower))
        .collect();

    if filtered.is_empty() {
        list.set_inner_html("<div class=\"quick-nav-option\" style=\"color:#777;cursor:default;\">无匹配结果</div>");
        return Ok(());
    }

    for (text, element) in filtered {
        let div = document.create_element("div")?;
        div.set_class_name("quick-nav-option");
        div.set_text_content(Some(&text));
        let list_clone = list.clone();
        let element_clone = element.clone();
        let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
            event.stop_propagation();
            let _ = list_clone.class_list().remove_1("show");
            let _ = highlight_and_scroll(&element_clone);
        }));
        div.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
        closure.forget();
        let _ = list.append_child(&div);
    }

    Ok(())
}

fn card_options(region_id: &str) -> Vec<(String, Element)> {
    let selector = format!("#{region_id} .card:not(.main-input)");
    elements(&selector)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|card| {
            let text = card
                .query_selector(".badge")
                .ok()
                .flatten()
                .and_then(|badge| badge.text_content())
                .unwrap_or_default();
            if text.is_empty() {
                None
            } else {
                Some((text, card))
            }
        })
        .collect()
}

fn find_search_target(query: &str) -> Option<Element> {
    let query = query.to_lowercase();
    for element in elements(".card, .logic-btn").ok()? {
        let text = if element.class_list().contains("card") {
            element
                .query_selector(".badge")
                .ok()
                .flatten()
                .and_then(|badge| badge.text_content())
                .unwrap_or_default()
        } else {
            clean_logic_text(&element.text_content().unwrap_or_default())
        };
        if text.to_lowercase().contains(&query) {
            return Some(element);
        }
    }
    None
}

fn highlight_and_scroll(target: &Element) -> Result<(), JsValue> {
    let is_logic = target.class_list().contains("logic-btn");

    if let Some(submodule) = target.closest(".submodule, .lianxiwomen-submodule")? {
        let submodule_clone = submodule.clone();
        TABSETS.with(|sets| {
            for state in sets.borrow().iter() {
                let Some(index) = state
                    .slides
                    .iter()
                    .position(|slide| slide.is_same_node(Some(&submodule_clone)))
                else {
                    continue;
                };
                if let Err(err) = tab_slide_to(state, index) {
                    console::error_1(&err);
                }
                state.container.set_scroll_left(0);
                if let Ok(Some(section)) = state.container.closest(".content-section") {
                    if html_style(&section).get_property_value("display").unwrap_or_default() == "none" {
                        let menu_id = section.id().replace("-content", "");
                        if let Ok(document) = document() {
                            if let Ok(Some(menu)) =
                                document.query_selector(&format!(".menu-item[data-target=\"{menu_id}\"]"))
                            {
                                if let Some(menu) = menu.dyn_ref::<HtmlElement>() {
                                    menu.click();
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    let class_name = if is_logic {
        "logic-highlight"
    } else {
        "card-highlight"
    };
    target.class_list().add_1(class_name)?;

    let target_for_scroll = target.clone();
    timeout(10, move || {
        let rect = target_for_scroll.get_bounding_client_rect();
        if let Ok(win) = window() {
            let scroll_top = win.page_y_offset().unwrap_or(0.0);
            let viewport_height = win
                .inner_height()
                .ok()
                .and_then(|height| height.as_f64())
                .unwrap_or(0.0);
            let target_top = rect.top() + scroll_top;
            let scroll_to_y = target_top - viewport_height / 2.0 + rect.height() / 2.0;
            let options = ScrollToOptions::new();
            options.set_top(scroll_to_y);
            options.set_behavior(ScrollBehavior::Smooth);
            win.scroll_to_with_scroll_to_options(&options);
        }
    });

    let target_for_clear = target.clone();
    let class_name = class_name.to_string();
    timeout(5000, move || {
        let _ = target_for_clear.class_list().remove_1(&class_name);
    });

    Ok(())
}

fn init_cipher_sticky_input_mask() -> Result<(), JsValue> {
    let win = window()?;
    if Reflect::get(win.as_ref(), &JsValue::from_str("cipherStickyInputMaskReady"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        win.as_ref(),
        &JsValue::from_str("cipherStickyInputMaskReady"),
        &JsValue::TRUE,
    )?;

    let cards = elements(
        "#jiamishiyanshi-content #mimaqu .main-input, #jiamishiyanshi-content #xiandaiqu .main-input",
    )?;
    if cards.is_empty() {
        return Ok(());
    }

    let ticking = Rc::new(Cell::new(false));
    let cards_rc = Rc::new(cards);
    let request_update: Rc<dyn Fn()> = {
        let ticking = ticking.clone();
        let cards = cards_rc.clone();
        Rc::new(move || {
            if ticking.get() {
                return;
            }
            ticking.set(true);
            let ticking_inner = ticking.clone();
            let cards_inner = cards.clone();
            request_animation_frame(move || {
                ticking_inner.set(false);
                update_sticky_cards(&cards_inner);
            });
        })
    };

    let scroll_update = request_update.clone();
    let scroll = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        scroll_update();
    }));
    win.add_event_listener_with_callback("scroll", scroll.as_ref().unchecked_ref())?;
    scroll.forget();

    let resize_update = request_update.clone();
    let resize = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        resize_update();
    }));
    win.add_event_listener_with_callback("resize", resize.as_ref().unchecked_ref())?;
    resize.forget();

    request_update();
    Ok(())
}

fn update_sticky_cards(cards: &[Element]) {
    let sticky_top = document()
        .ok()
        .and_then(|document| document.get_element_by_id("jiamishiyanshi-content"))
        .and_then(|section| window().ok()?.get_computed_style(&section).ok().flatten())
        .and_then(|style| {
            style
                .get_property_value("--cipher-lab-input-sticky-top")
                .ok()
                .and_then(|value| value.trim().parse::<f64>().ok())
        })
        .unwrap_or(0.0);

    for card in cards {
        let active = card
            .closest(".submodule")
            .ok()
            .flatten()
            .map(|submodule| submodule.class_list().contains("active"))
            .unwrap_or(true);
        let stuck = active && card.get_bounding_client_rect().top() <= sticky_top + 1.0;
        let _ = card.class_list().toggle_with_force("cipher-stuck", stuck);
    }
}

fn init_pin_toggle() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(document.as_ref(), &JsValue::from_str("__rustPinToggleReady"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustPinToggleReady"),
        &JsValue::TRUE,
    )?;

    let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        let Some(target) = event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
            .and_then(|target| target.closest(".pin-toggle-btn").ok().flatten())
        else {
            return;
        };
        let Some(card) = target.closest(".card").ok().flatten() else {
            return;
        };
        event.prevent_default();

        let tag = target.query_selector(".cyber-button__tag").ok().flatten();
        let is_pinned = card.class_list().contains("pinned");
        if !is_pinned {
            if let Err(err) = pin_card(&card, tag.as_ref()) {
                console::error_1(&err);
            }
        } else if let Err(err) = unpin_card(&card, tag.as_ref()) {
            console::error_1(&err);
        }
    }));
    document.add_event_listener_with_callback("click", closure.as_ref().unchecked_ref())?;
    closure.forget();
    Ok(())
}

fn pin_card(card: &Element, tag: Option<&Element>) -> Result<(), JsValue> {
    let document = document()?;
    let placeholder = document.create_element("div")?;
    placeholder.set_class_name("card-placeholder");
    if card.class_list().contains("main-input") {
        placeholder.class_list().add_1("main-input")?;
    }
    set_display(&placeholder, "none");
    let pid = format!("pin-placeholder-{}", js_sys::Date::now() as u64);
    placeholder.set_id(&pid);
    card.set_attribute("data-placeholder-id", &pid)?;

    if let Some(parent) = card.parent_node() {
        let card_node: Node = card.clone().into();
        let placeholder_node: Node = placeholder.clone().into();
        let _ = parent.insert_before(&placeholder_node, Some(&card_node));
    }

    let win = window()?;
    let scroll_x = win.scroll_x().unwrap_or(0.0);
    let scroll_y = win.scroll_y().unwrap_or(0.0);
    if let Some(body) = document.body() {
        let _ = body.append_child(card);
    }
    let card_clone = card.clone();
    request_animation_frame(move || {
        let _ = card_clone.class_list().add_1("pinned");
        if let Ok(win) = window() {
            win.scroll_to_with_x_and_y(scroll_x, scroll_y);
        }
    });
    if let Some(tag) = tag {
        tag.set_text_content(Some("取消置顶"));
    }
    Ok(())
}

fn unpin_card(card: &Element, tag: Option<&Element>) -> Result<(), JsValue> {
    let document = document()?;
    let pid = card.get_attribute("data-placeholder-id").unwrap_or_default();
    if let Some(placeholder) = document.get_element_by_id(&pid) {
        card.class_list().remove_1("pinned")?;
        if let Some(parent) = placeholder.parent_node() {
            let card_node: Node = card.clone().into();
            let placeholder_node: Node = placeholder.clone().into();
            let _ = parent.insert_before(&card_node, Some(&placeholder_node));
            placeholder.remove();
        }
        let _ = card.remove_attribute("data-placeholder-id");
    } else {
        card.class_list().remove_1("pinned")?;
    }
    if let Some(tag) = tag {
        tag.set_text_content(Some("置顶"));
    }
    Ok(())
}

fn init_mobile_height() -> Result<(), JsValue> {
    let win = window()?;
    set_mobile_height();
    let last_width = Rc::new(Cell::new(win.inner_width()?.as_f64().unwrap_or(0.0)));
    let closure = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Ok(win) = window() {
            let width = win.inner_width().ok().and_then(|v| v.as_f64()).unwrap_or(0.0);
            if (width - last_width.get()).abs() > f64::EPSILON {
                last_width.set(width);
                set_mobile_height();
            }
        }
    }));
    win.add_event_listener_with_callback("resize", closure.as_ref().unchecked_ref())?;
    closure.forget();
    Ok(())
}

fn set_mobile_height() {
    if let (Ok(win), Ok(document)) = (window(), document()) {
        let vh = win.inner_height().ok().and_then(|v| v.as_f64()).unwrap_or(0.0) * 0.01;
        if let Some(root) = document.document_element() {
            let _ = html_style(&root).set_property("--vh", &format!("{vh}px"));
        }
    }
}

fn init_author_page() -> Result<(), JsValue> {
    let document = document()?;
    let Some(modal) = document.get_element_by_id("imagePreviewModal") else {
        return Ok(());
    };
    let Some(preview_img) = document.get_element_by_id("previewImage") else {
        return Ok(());
    };
    let Some(reward_card) = document.get_element_by_id("rewardCard") else {
        return Ok(());
    };
    if Reflect::get(reward_card.as_ref(), &JsValue::from_str("__rustAuthorReady"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        reward_card.as_ref(),
        &JsValue::from_str("__rustAuthorReady"),
        &JsValue::TRUE,
    )?;

    let modal_open = modal.clone();
    let preview_open: HtmlImageElement = preview_img.clone().unchecked_into();
    let reward_for_click = reward_card.clone();
    let reward_click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Ok(Some(img)) = reward_for_click.query_selector("img") {
            let img: HtmlImageElement = img.unchecked_into();
            preview_open.set_src(&img.src());
            let _ = modal_open.class_list().add_1("active");
        }
    }));
    reward_card.add_event_listener_with_callback("click", reward_click.as_ref().unchecked_ref())?;
    reward_click.forget();

    let modal_close = modal.clone();
    let modal_click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        let same_target = event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
            .map(|target| target.is_same_node(Some(&modal_close)))
            .unwrap_or(false);
        if same_target {
            let _ = modal_close.class_list().remove_1("active");
        }
    }));
    modal.add_event_listener_with_callback("click", modal_click.as_ref().unchecked_ref())?;
    modal_click.forget();

    Ok(())
}

fn init_usage_guide() -> Result<(), JsValue> {
    let document = document()?;
    if Reflect::get(document.as_ref(), &JsValue::from_str("__rustUsageGuideReady"))
        .ok()
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
    {
        return Ok(());
    }
    Reflect::set(
        document.as_ref(),
        &JsValue::from_str("__rustUsageGuideReady"),
        &JsValue::TRUE,
    )?;

    let click = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |event: Event| {
        let Some(button) = event
            .target()
            .and_then(|target| target.dyn_into::<Element>().ok())
            .and_then(|target| target.closest(".usage-guide-btn, [data-guide-id]").ok().flatten())
        else {
            return;
        };
        event.prevent_default();
        event.stop_propagation();
        let guide_id = guide_id_from_button(&button);
        if let Err(err) = open_usage_guide(&guide_id) {
            console::error_1(&err);
        }
    }));
    document.add_event_listener_with_callback("click", click.as_ref().unchecked_ref())?;
    click.forget();

    let keydown = Closure::<dyn FnMut(KeyboardEvent)>::wrap(Box::new(move |event: KeyboardEvent| {
        if !usage_guide_is_active() {
            return;
        }
        match event.key().as_str() {
            "Escape" => {
                event.prevent_default();
                event.stop_propagation();
                if let Err(err) = close_usage_guide() {
                    console::error_1(&err);
                }
            }
            "ArrowRight" => {
                event.prevent_default();
                event.stop_propagation();
                if let Err(err) = move_usage_guide_step(1) {
                    console::error_1(&err);
                }
            }
            "ArrowLeft" => {
                event.prevent_default();
                event.stop_propagation();
                if let Err(err) = move_usage_guide_step(-1) {
                    console::error_1(&err);
                }
            }
            _ => {}
        }
    }));
    document.add_event_listener_with_callback_and_bool("keydown", keydown.as_ref().unchecked_ref(), true)?;
    keydown.forget();

    let resize = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Err(err) = position_usage_guide() {
            console::error_1(&err);
        }
    }));
    window()?.add_event_listener_with_callback("resize", resize.as_ref().unchecked_ref())?;
    resize.forget();

    let scroll = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
        if let Err(err) = position_usage_guide() {
            console::error_1(&err);
        }
    }));
    document.add_event_listener_with_callback_and_bool("scroll", scroll.as_ref().unchecked_ref(), true)?;
    scroll.forget();

    Ok(())
}

fn ensure_usage_guide_dom() -> Result<(), JsValue> {
    let document = document()?;
    if document.get_element_by_id("cipherUsageGuide").is_some() {
        return Ok(());
    }

    let guide = document.create_element("div")?;
    guide.set_id("cipherUsageGuide");
    guide.set_class_name("cipher-guide");
    guide.set_attribute("aria-hidden", "true")?;
    guide.set_inner_html(
        r#"
        <div class="cipher-guide-shade"></div>
        <div class="cipher-guide-spotlight"></div>
        <section class="cipher-guide-panel" role="dialog" aria-modal="true" aria-labelledby="cipherGuideTitle">
            <button type="button" class="cipher-guide-close" aria-label="关闭使用说明">×</button>
            <p class="cipher-guide-kicker"></p>
            <h3 class="cipher-guide-title" id="cipherGuideTitle"></h3>
            <p class="cipher-guide-body"></p>
            <div class="cipher-guide-actions">
                <button type="button" class="cipher-guide-btn cipher-guide-prev">上一步</button>
                <span class="cipher-guide-spacer"></span>
                <button type="button" class="cipher-guide-btn cipher-guide-skip">跳过</button>
                <button type="button" class="cipher-guide-btn primary cipher-guide-next">下一步</button>
            </div>
        </section>
        "#,
    );

    let body = document
        .body()
        .ok_or_else(|| JsValue::from_str("document.body is missing"))?;
    body.append_child(&guide)?;

    for selector in [".cipher-guide-close", ".cipher-guide-skip"] {
        if let Some(button) = guide.query_selector(selector)? {
            let close = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
                if let Err(err) = close_usage_guide() {
                    console::error_1(&err);
                }
            }));
            button.add_event_listener_with_callback("click", close.as_ref().unchecked_ref())?;
            close.forget();
        }
    }

    if let Some(button) = guide.query_selector(".cipher-guide-prev")? {
        let prev = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            if let Err(err) = move_usage_guide_step(-1) {
                console::error_1(&err);
            }
        }));
        button.add_event_listener_with_callback("click", prev.as_ref().unchecked_ref())?;
        prev.forget();
    }

    if let Some(button) = guide.query_selector(".cipher-guide-next")? {
        let next = Closure::<dyn FnMut(Event)>::wrap(Box::new(move |_event: Event| {
            if let Err(err) = move_usage_guide_step(1) {
                console::error_1(&err);
            }
        }));
        button.add_event_listener_with_callback("click", next.as_ref().unchecked_ref())?;
        next.forget();
    }

    Ok(())
}

fn guide_id_from_button(button: &Element) -> String {
    if let Some(guide_id) = button.get_attribute("data-guide-id") {
        return guide_id;
    }
    if button.closest("#xiandaiqu").ok().flatten().is_some() {
        "xiandaiqu".to_string()
    } else if button.closest("#zhishitupu-content").ok().flatten().is_some() {
        "zhishitupu".to_string()
    } else {
        "mimaqu".to_string()
    }
}

fn guide_set(id: &str) -> &'static GuideSet {
    GUIDE_SETS
        .iter()
        .find(|set| set.id == id)
        .unwrap_or(&GUIDE_SETS[0])
}

fn open_usage_guide(id: &str) -> Result<(), JsValue> {
    ensure_usage_guide_dom()?;
    let set = guide_set(id);
    let document = document()?;
    if let Some(guide) = document.get_element_by_id("cipherUsageGuide") {
        guide.class_list().add_1("active")?;
        guide.set_attribute("aria-hidden", "false")?;
    }
    if let Some(body) = document.body() {
        body.class_list().add_1("cipher-guide-open")?;
    }

    GUIDE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.active_id = Some(set.id);
        state.active_index = 0;
    });
    render_usage_guide_step(true)
}

fn close_usage_guide() -> Result<(), JsValue> {
    let document = document()?;
    if let Some(guide) = document.get_element_by_id("cipherUsageGuide") {
        guide.class_list().remove_1("active")?;
        guide.set_attribute("aria-hidden", "true")?;
    }
    if let Some(body) = document.body() {
        body.class_list().remove_1("cipher-guide-open")?;
    }
    clear_usage_guide_target()?;
    GUIDE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        state.active_id = None;
        state.active_index = 0;
    });
    Ok(())
}

fn move_usage_guide_step(offset: i32) -> Result<(), JsValue> {
    let should_close = GUIDE_STATE.with(|state| {
        let mut state = state.borrow_mut();
        let Some(active_id) = state.active_id else {
            return false;
        };
        let set = guide_set(active_id);
        let next = state.active_index as i32 + offset;
        if next < 0 {
            return false;
        }
        if next as usize >= set.steps.len() {
            return true;
        }
        state.active_index = next as usize;
        false
    });

    if should_close {
        close_usage_guide()
    } else {
        render_usage_guide_step(true)
    }
}

fn render_usage_guide_step(should_scroll: bool) -> Result<(), JsValue> {
    let Some((set, index)) = GUIDE_STATE.with(|state| {
        let state = state.borrow();
        Some((guide_set(state.active_id?), state.active_index))
    }) else {
        return Ok(());
    };
    let Some(step) = set.steps.get(index) else {
        return Ok(());
    };

    let target = find_usage_guide_target(step.selector)?;
    clear_usage_guide_target()?;
    if let Some(target) = &target {
        target.class_list().add_1("cipher-guide-active-target")?;
    }
    GUIDE_STATE.with(|state| state.borrow_mut().active_target = target.clone());

    let document = document()?;
    if let Some(guide) = document.get_element_by_id("cipherUsageGuide") {
        if let Some(kicker) = guide.query_selector(".cipher-guide-kicker")? {
            kicker.set_text_content(Some(&format!("{} · {}/{}", set.label, index + 1, set.steps.len())));
        }
        if let Some(title) = guide.query_selector(".cipher-guide-title")? {
            title.set_text_content(Some(step.title));
        }
        if let Some(body) = guide.query_selector(".cipher-guide-body")? {
            body.set_text_content(Some(step.body));
        }
        if let Some(prev) = guide.query_selector(".cipher-guide-prev")? {
            if index == 0 {
                prev.set_attribute("disabled", "disabled")?;
            } else {
                let _ = prev.remove_attribute("disabled");
            }
        }
        if let Some(next) = guide.query_selector(".cipher-guide-next")? {
            next.set_text_content(Some(if index + 1 == set.steps.len() {
                "完成"
            } else {
                "下一步"
            }));
        }
    }

    if let Some(target) = target {
        if should_scroll {
            target.scroll_into_view();
            timeout(260, || {
                if let Err(err) = position_usage_guide() {
                    console::error_1(&err);
                }
            });
            return Ok(());
        }
    }
    position_usage_guide()
}

fn clear_usage_guide_target() -> Result<(), JsValue> {
    GUIDE_STATE.with(|state| {
        if let Some(target) = state.borrow_mut().active_target.take() {
            let _ = target.class_list().remove_1("cipher-guide-active-target");
        }
    });
    Ok(())
}

fn usage_guide_is_active() -> bool {
    GUIDE_STATE.with(|state| state.borrow().active_id.is_some())
}

fn find_usage_guide_target(selector: &str) -> Result<Option<Element>, JsValue> {
    let Some(target) = document()?.query_selector(selector)? else {
        return Ok(None);
    };
    let rect = target.get_bounding_client_rect();
    if rect.width() == 0.0 && rect.height() == 0.0 {
        Ok(None)
    } else {
        Ok(Some(target))
    }
}

fn position_usage_guide() -> Result<(), JsValue> {
    let Some((set, index)) = GUIDE_STATE.with(|state| {
        let state = state.borrow();
        Some((guide_set(state.active_id?), state.active_index))
    }) else {
        return Ok(());
    };
    let Some(step) = set.steps.get(index) else {
        return Ok(());
    };

    let document = document()?;
    let Some(guide) = document.get_element_by_id("cipherUsageGuide") else {
        return Ok(());
    };
    if !guide.class_list().contains("active") {
        return Ok(());
    }
    let Some(spotlight) = guide.query_selector(".cipher-guide-spotlight")? else {
        return Ok(());
    };
    let Some(panel) = guide.query_selector(".cipher-guide-panel")? else {
        return Ok(());
    };

    let target = find_usage_guide_target(step.selector)?;
    let win = window()?;
    let viewport_width = win.inner_width()?.as_f64().unwrap_or(0.0);
    let viewport_height = win.inner_height()?.as_f64().unwrap_or(0.0);
    let rect = target
        .as_ref()
        .map(Element::get_bounding_client_rect);
    let fallback_top = viewport_height / 2.0 - 40.0;
    let fallback_left = viewport_width / 2.0 - 80.0;
    let (rect_top, rect_left, rect_bottom, rect_width, rect_height) = if let Some(rect) = rect {
        (rect.top(), rect.left(), rect.bottom(), rect.width(), rect.height())
    } else {
        (fallback_top, fallback_left, fallback_top + 80.0, 160.0, 80.0)
    };
    let pad = 16.0;
    let highlight_pad = if target.is_some() { 8.0 } else { 0.0 };
    let spotlight_style = html_style(&spotlight);
    spotlight_style.set_property("top", &format!("{}px", (rect_top - highlight_pad).max(pad)))?;
    spotlight_style.set_property("left", &format!("{}px", (rect_left - highlight_pad).max(pad)))?;
    spotlight_style.set_property(
        "width",
        &format!("{}px", (rect_width + highlight_pad * 2.0).min(viewport_width - pad * 2.0)),
    )?;
    spotlight_style.set_property(
        "height",
        &format!("{}px", (rect_height + highlight_pad * 2.0).min(viewport_height - pad * 2.0)),
    )?;

    let panel_width = 360.0_f64.min(viewport_width - pad * 2.0);
    let panel_style = html_style(&panel);
    panel_style.set_property("width", &format!("{panel_width}px"))?;
    let panel_height = panel
        .dyn_ref::<HtmlElement>()
        .map(HtmlElement::offset_height)
        .unwrap_or(220) as f64;
    let mut top = rect_bottom + 18.0;
    if top + panel_height > viewport_height - pad {
        top = rect_top - panel_height - 18.0;
    }
    if top < pad {
        top = pad;
    }
    let mut left = rect_left + rect_width / 2.0 - panel_width / 2.0;
    left = left.max(pad).min(viewport_width - panel_width - pad);
    panel_style.set_property("top", &format!("{top}px"))?;
    panel_style.set_property("left", &format!("{left}px"))?;
    Ok(())
}

fn load_lazy_images(root: Option<&Element>) -> Result<(), JsValue> {
    let selector_root: Element = match root {
        Some(root) => root.clone(),
        None => document()?.document_element().unwrap().into(),
    };
    let images = selector_root.query_selector_all("img[data-src]")?;
    for index in 0..images.length() {
        let Some(node) = images.item(index) else {
            continue;
        };
        let element: Element = node.unchecked_into();
        if element.get_attribute("src").unwrap_or_default().is_empty() {
            if let Some(src) = element.get_attribute("data-src") {
                let _ = element.set_attribute("src", &src);
            }
        }
    }
    Ok(())
}

fn is_knowledge_graph_visible() -> bool {
    let Ok(document) = document() else {
        return false;
    };
    let container_visible = document
        .get_element_by_id("zhishitupu-container")
        .map(|container| html_style(&container).get_property_value("display").unwrap_or_default() != "none")
        .unwrap_or(false);
    let content_visible = document
        .get_element_by_id("zhishitupu-content")
        .and_then(|content| content.dyn_into::<HtmlElement>().ok())
        .and_then(|content| content.offset_parent())
        .is_some();
    container_visible || content_visible
}

fn focus_knowledge_graph_node(query: &str) {
    if query.is_empty() {
        return;
    }
    if run_knowledge_graph_search(query) {
        return;
    }
    if call_global0("initKnowledgeGraph") {
        let query = query.to_string();
        timeout(100, move || {
            let _ = run_knowledge_graph_search(&query);
        });
    }
}

fn run_knowledge_graph_search(query: &str) -> bool {
    let Some(zstp) = window_prop("ZSTP") else {
        return false;
    };
    let Ok(func) = Reflect::get(&zstp, &JsValue::from_str("focusNode")) else {
        return false;
    };
    let Some(func) = func.dyn_ref::<Function>() else {
        return false;
    };
    func.call1(&zstp, &JsValue::from_str(query))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false)
}

fn visible_content_section_id() -> Result<Option<String>, JsValue> {
    for section in elements(".content-section")? {
        if html_style(&section).get_property_value("display").unwrap_or_default() != "none" {
            return Ok(Some(section.id()));
        }
    }
    Ok(None)
}

fn clean_logic_text(text: &str) -> String {
    text.chars()
        .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '_' || ('\u{4e00}'..='\u{9fa5}').contains(ch))
        .collect()
}

fn call_global0(name: &str) -> bool {
    let Some(value) = window_prop(name) else {
        return false;
    };
    let Some(func) = value.dyn_ref::<Function>() else {
        return false;
    };
    func.call0(&JsValue::NULL).is_ok()
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

fn window_prop(name: &str) -> Option<JsValue> {
    Reflect::get(window().ok()?.as_ref(), &JsValue::from_str(name)).ok()
}

fn window_prop_string(name: &str) -> Option<String> {
    window_prop(name).and_then(|value| value.as_string())
}

fn asset_version() -> String {
    window_prop_string("CIPHERTOOL_ASSET_VERSION").unwrap_or_else(|| LOAD_VERSION.to_string())
}

fn set_display(element: &Element, value: &str) {
    let _ = html_style(element).set_property("display", value);
}

fn html_style(element: &Element) -> web_sys::CssStyleDeclaration {
    element.unchecked_ref::<HtmlElement>().style()
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

fn dispatch_resize() {
    if let Ok(event) = Event::new("resize") {
        if let Ok(win) = window() {
            let _ = win.dispatch_event(&event);
        }
    }
}

fn request_animation_frame<F>(f: F)
where
    F: FnOnce() + 'static,
{
    if let Ok(win) = window() {
        let closure = Closure::<dyn FnMut()>::once(f);
        let _ = win.request_animation_frame(closure.as_ref().unchecked_ref());
        closure.forget();
    }
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
