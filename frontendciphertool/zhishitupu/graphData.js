// ========== 知识图谱 - 树形数据源 ==========
// 添加节点只需在对应分支的 children 下加一行 { name: '名称' }
// id、group、color、link 全部自动生成，无需手动维护

let _graphAutoId = 0;

function buildGraphData(roots, THEME, prefix) {
    const nodes = [], links = [];
    const pfx = prefix || '_n';
    function walk(raw, parentId, inheritGroup, inheritColor) {
        const group = raw.group || inheritGroup || 'classic';
        const color = raw.color != null ? raw.color : (inheritColor != null ? inheritColor : (THEME[group] ?? 0xffffff));
        const id = pfx + _graphAutoId++;
        nodes.push({ id, name: raw.name, val: raw.val, color, group });
        if (parentId) links.push({ source: parentId, target: id });
        const nextGroup = raw.childGroup || group;
        const nextColor = raw.childColor != null ? raw.childColor : color;
        (raw.children || []).forEach(c => walk(c, id, nextGroup, nextColor));
    }
    roots.forEach(r => walk(r, null));
    return { nodes, links };

}

function getGraphTree(THEME) {
    return [
        {
            name: '加密实验室', val: 80, group: 'root', color: THEME.root,
            children: [
                {
                    name: '经典区', val: 40, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: '凯撒 Caesar' },
                        { name: '维吉尼亚 Vigenère' },
                        { name: '栅栏 Rail Fence' },
                        { name: 'AtBash 埃特巴什' },
                        { name: '进制 Base Converter' },
                        { name: '摩尔斯 Morse' },
                        { name: '手机九键 Phone Keypad' },
                        { name: '比尔密码 Beale Cipher' },
                        { name: '反切码 Fanqie' },
                        { name: 'mRNA序列 mRNA Sequence' },
                        { name: 'V字键盘 V-Keyboard' },
                        { name: 'QWE键盘 QWE Keyboard' },
                        { name: 'Bacon 培根' },
                        { name: '柱状栅栏 Columnar Rail Fence' },
                        { name: 'W型栅栏 W-Rail Fence' },
                        { name: '01248密码 01248 Cipher' },
                        { name: '元音密码 Vowel' },
                        { name: 'ASCII码' },
                        { name: '中文电码 Chinese Telegraph Code' },
                        { name: '四角号码 Four Corner Code' },
                        { name: 'ROT 旋转加密' },
                        { name: 'Polybius Square 波利比乌斯方阵' },
                        { name: 'ADFGX/ADFVGX 密码' },
                        { name: '仿射 Affine' },
                        { name: '敲击码 Tap Code' },
                        { name: 'BifidCipher 双密码' },
                        { name: '旗语-盲文 Semaphore-Braille' },
                        { name: 'Base 编码' },
                    ]
                },
                {
                    name: '现代区', val: 40, group: 'category', color: THEME.category, childGroup: 'modern',
                    children: [
                        { name: 'MD5', val: 20 },
                        { name: 'SHA-1', val: 15 },
                        { name: 'SHA-256', val: 15 },
                        { name: 'SHA-384', val: 15 },
                        { name: 'SHA-512', val: 15 },
                        { name: 'Enigma', val: 30 },
                    ]
                },
                {
                    name: '逻辑区', val: 40, group: 'category', color: THEME.category, childGroup: 'logic',
                    children: [
                        { name: '数独' },
                        { name: 'Akari' },
                        { name: 'Aqre' },
                        { name: 'Aquapelago' },
                        { name: 'Aquarium' },
                        { name: 'Balance Loop' },
                        { name: 'Battleship' },
                        { name: 'Binairo' },
                        { name: 'Castle Wall' },
                        { name: 'Cave' },
                        { name: 'Chocobanana' },
                        { name: 'Chocona' },
                        { name: 'Country Road' },
                        { name: 'Doppelblock' },
                        { name: 'Easy as ABC' },
                        { name: 'Fillomino' },
                        { name: 'Gokigen' },
                        { name: 'Haisu' },
                        { name: 'Haisu Slow' },
                        { name: 'Hamle' },
                        { name: 'Hashi' },
                        { name: 'Heteromino' },
                        { name: 'Heyawake' },
                        { name: 'Hitori' },
                        { name: 'Hotaru' },
                        { name: 'Kakuro' },
                        { name: 'Kuromasu' },
                        { name: 'Kurotto' },
                        { name: 'LITS' },
                        { name: 'Magnets' },
                        { name: 'Masyu' },
                        { name: 'Minesweeper' },
                        { name: 'Moon-Sun' },
                        { name: 'Nagare' },
                        { name: 'Nanro' },
                        { name: 'N-Cells' },
                        { name: 'Nonogram' },
                        { name: 'Norinori' },
                        { name: 'Numberlink' },
                        { name: 'Nuribou' },
                        { name: 'Nurikabe' },
                        { name: 'Nurimisaki' },
                        { name: 'Onsen' },
                        { name: 'Ripple Effect' },
                        { name: 'Shakashaka' },
                        { name: 'Shikaku' },
                        { name: 'Shimaguni' },
                        { name: 'Skyscrapers' },
                        { name: 'Slitherlink' },
                        { name: 'Spiral Galaxies' },
                        { name: 'Star Battle' },
                        { name: 'Statue Park' },
                        { name: 'Stostone' },
                        { name: 'Tapa' },
                        { name: 'Tatamibari' },
                        { name: 'Tents' },
                        { name: 'TLL' },
                        { name: 'Tren' },
                        { name: 'Yajilin' },
                        { name: 'Yajisan-Kazusan' },
                        { name: 'Yin-Yang' },
                    ]
                },
                {
                    name: '词汇区', val: 20, group: 'category', color: THEME.category, childGroup: 'word',
                    children: [
                        { name: '爆破' },
                    ]
                },
            ]
        },
        {
            name: '电子实验室', val: 80, group: 'root', color: THEME.eleroot,
            children: [
                {
                    name: '无源元件', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: '电阻' },
                        { name: '电容' },
                        { name: '极性电容' },
                        { name: '电感' },
                        { name: '开关' },
                        { name: '变压器' },
                        { name: '输电电路' },
                        { name: '继电器' },
                        { name: '光敏电阻' },
                        { name: '热敏电阻' },
                        { name: '压敏电阻' },
                        { name: '火花隙' },
                        { name: '保险丝' },
                        { name: '晶振' },
                    ]
                },
                {
                    name: '有源元件', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: '二极管' },
                        { name: '齐纳二极管' },
                        { name: '变容二极管' },
                        { name: '隧道二极管' },
                        { name: '三极管' },
                        { name: '单结型晶体管' },
                        { name: 'NPN' },
                        { name: 'PNP' },
                        { name: 'MOSFET' },
                        { name: 'JFET' },
                        { name: '可控硅' },
                        { name: '达林顿管' },
                    ]
                },
                {
                    name: '输入与电源', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: 'GND' },
                        { name: '可变电压' },
                        { name: 'DC' },
                        { name: 'AC' },
                        { name: '方波' },
                        { name: '时钟' },
                        { name: '扫频' },
                        { name: '天线' },
                        { name: '调幅' },
                        { name: '调频' },
                        { name: '电流源' },
                        { name: '噪音发生器' },
                    ]
                },
                {
                    name: '集成电路', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: '运算放大器' },
                        { name: 'SPST' },
                        { name: 'SPDT' },
                        { name: '三态缓冲' },
                        { name: '施密特触发器' },
                        { name: '延迟缓冲器' },
                        { name: 'CCIl+-' },
                        { name: '比较器' },
                        { name: 'OTA' },
                        { name: '电压控制电压源' },
                        { name: '电压控制电流源' },
                        { name: '电流控制电压源' },
                        { name: '电流控制电流源' },
                        { name: '光耦' },
                        { name: '延时继电器' },
                        { name: 'LM317' },
                        { name: 'TL431' },
                        { name: 'Motor Protection Switch' },
                    ]
                },
                {
                    name: '组合电路', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: 'LRC电路' },
                        { name: '分压器' },
                        { name: '电位器分压器' },
                        { name: '戴维宁定理' },
                        { name: '诺顿定理' },
                        { name: '申联谐振' },
                        { name: '并联共振' },
                        { name: '滤波器' },
                        { name: '微分电路' },
                        { name: '惠斯通电桥' },
                        { name: '耦合LC' },
                        { name: '相序网络' },
                        { name: '莉萨如图形' },
                        { name: '锁相环' },
                        { name: '锯齿波发生器' },
                        { name: '特斯拉线圈' },
                        { name: '马克思发生器' },
                        { name: 'OTA环调制器' },
                        { name: 'LM137000增益' },
                        { name: '忆阻器' },
                        { name: 'LC振荡器' },
                    ]
                },
                {
                    name: '逻辑门', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: '非门' },
                        { name: '与非门' },
                        { name: '或非门' },
                        { name: '与门' },
                        { name: '或门' },
                        { name: '异或门' },
                    ]
                },
                {
                    name: 'IC', val: 30, group: 'category', color: THEME.category, childGroup: 'classic',
                    children: [
                        { name: 'D触发器' },
                        { name: 'JK触发器' },
                        { name: 'T触发器' },
                        { name: '7段LED显示器' },
                        { name: '7段译码器' },
                        { name: '多路复用器' },
                        { name: '信号分离器' },
                        { name: 'SIPO移位寄存器' },
                        { name: 'PISO移位寄存器' },
                        { name: '计数器' },
                        { name: '环形计数器' },
                        { name: '锁存器' },
                        { name: '序列发生器' },
                        { name: '加法器' },
                        { name: '半加器' },
                        { name: '静态随机存储器' },
                    ]
                },
            ]
        }
    ];
}
