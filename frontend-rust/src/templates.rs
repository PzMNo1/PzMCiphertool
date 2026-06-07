pub const MODULE_IDS: [&str; 8] = ["jiamishiyanshi", "electroniclab", "workflow", "zhishitupu", "apizhongzhuanzhan", "mcpskilllab", "damoxing", "yijianfankui"];

pub fn module_template(id: &str) -> Option<&'static str> {
    match id {
        "jiamishiyanshi" => Some(include_str!("templates/jiamishiyanshi.html")),
        "electroniclab" => Some(include_str!("templates/electroniclab.html")),
        "workflow" => Some(include_str!("templates/workflow.html")),
        "zhishitupu" => Some(include_str!("templates/zhishitupu.html")),
        "apizhongzhuanzhan" => Some(include_str!("templates/apizhongzhuanzhan.html")),
        "mcpskilllab" => Some(include_str!("templates/mcpskilllab.html")),
        "damoxing" => Some(include_str!("templates/damoxing.html")),
        "yijianfankui" => Some(include_str!("templates/yijianfankui.html")),
        _ => None,
    }
}
