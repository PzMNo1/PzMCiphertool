/**
 * 主要接口
 *
 * BoolVar() : 创建布尔变量
 * IntVar() : 创建非负整数变量
 * IntVar(1,9) : 范围为1-9的整数变量(包含)
 * IntVar([1,2,3]) : 具有指定值之一的整数变量
 * MultiVar('a','b') : 具有给定值之一的广义变量
 * Atom() : 只有在被证明时才为真的原子，使用Atom.prove_if(<b>)
 * cond(<pred>, <cons>, <alt>) : 创建"if"语句
 * require(<expr>) : 约束变量或表达式为真
 * solve() : 运行clasp并返回是否可满足
 *
 * 在运行solve后，打印变量或调用var.value()获取结果
 */

/**
 * 其他函数
 *
 * reset() : 重置系统。重置后不要使用旧变量
 * set_bits(8) : 设置整数变量的位数
 *               必须在创建任何变量之前调用
 * set_max_val(100) : 为给定值设置必要的最大位数
 *                    必须在创建任何变量之前调用
 * require_all_diff(lst) : 约束列表中的所有变量不同
 * sum_vars(lst) : 对变量列表求和的便捷函数
 * at_least(n, bools) : 至少n个布尔值为真
 * at_most(n, bools) : 最多n个布尔值为真
 * sum_bools(n, bools) : 恰好n个布尔值为真
 * required(<expr>, <str>) : 表达式为假时打印调试字符串
 *   可以将'require'语句更改为'required'以进行调试
 * var_in(v, lst) : 变量v是否等于列表中的某个元素
 */

// 参数设置
const CLASP_COMMAND = 'clasp --sat-prepro --eq=1 --trans-ext=dynamic';

// 基础设施
let verbose = false;
let last_update = Date.now();
let memo_caches = [];
let NUM_BITS = 16;
let BITS = Array.from({length: NUM_BITS}, (_, i) => i);

// 求解器变量
let last_bool = 1; // 在clasp中保留
let TRUE_BOOL = null;
let FALSE_BOOL = null;
let solution = null;
let debug_constraints = [];
let clasp_rules = [];
let single_vars = new Set();
let start_time = Date.now();

// 辅助函数
function set_verbose(b = true) {
    verbose = b;
}

function need_update() {
    if (Date.now() - last_update > 2000) {
        last_update = Date.now();
        return true;
    }
    return false;
}

function hash_object(x) {
    if (x && typeof x.hash_object === 'function') {
        return x.hash_object();
    } else {
        return x;
    }
}

// 装饰器函数的替代实现
function memoized(func) {
    const cache = {};
    memo_caches.push(cache);
    
    return function(...args) {
        try {
            const key = JSON.stringify(args.map(hash_object));
            if (key in cache) {
                return cache[key];
            }
            const value = func(...args);
            cache[key] = value;
            return value;
        } catch (e) {
            return func(...args);
        }
    };
}

function memoized_symmetric(func) {
    const cache = {};
    memo_caches.push(cache);
    
    return function(...args) {
        try {
            const key = JSON.stringify([...args].map(hash_object).sort());
            if (key in cache) {
                return cache[key];
            }
            const value = func(...args);
            cache[key] = value;
            return value;
        } catch (e) {
            return func(...args);
        }
    };
}

// 求解器函数
function new_literal() {
    last_bool += 1;
    return last_bool;
}

function add_rule(vals) {
    clasp_rules.push(vals);
    if (need_update()) {
        console.log(`${clasp_rules.length} rules`);
    }
}

function lit2str(literals) {
    return literals.map(x => 
        x > 0 ? `v${x}` : `not v${Math.abs(x)}`
    ).join(', ');
}

function head2str(head) {
    return head === 1 ? '' : `v${head}`;
}

function add_basic_rule(head, literals) {
    if (verbose) {
        if (literals.length === 0) console.log(`${head2str(head)}.`);
        else console.log(`${head2str(head)} :- ${lit2str(literals)}.`);
    }
    
    literals = optimize_basic_rule(head, literals);
    if (literals === null) {
        if (verbose) console.log('#opt');
        return;
    }
    
    if (verbose) {
        if (literals.length === 0) console.log(`#opt ${head2str(head)}.`);
        else console.log(`#opt ${head2str(head)} :- ${lit2str(literals)}.`);
    }
    
    const negative_literals = literals.filter(x => x < 0).map(Math.abs);
    const positive_literals = literals.filter(x => x > 0);
    
    add_rule([1, head, literals.length, negative_literals.length]
             .concat(negative_literals)
             .concat(positive_literals));
}

function add_choice_rule(heads, literals) {
    if (verbose) {
        if (literals.length === 0) {
            console.log(`{ ${lit2str(heads)} }.`);
        } else {
            console.log(`{ ${lit2str(heads)} } :- ${lit2str(literals)}`);
        }
    }
    
    heads.forEach(i => { if (i <= 0) throw new Error("Head must be positive"); });
    
    const negative_literals = literals.filter(x => x < 0).map(Math.abs);
    const positive_literals = literals.filter(x => x > 0);
    
    add_rule([3, heads.length].concat(heads)
             .concat([literals.length, negative_literals.length])
             .concat(negative_literals)
             .concat(positive_literals));
}

function add_constraint_rule(head, bound, literals) {
    if (verbose) {
        console.log(`${head2str(head)} :- ${bound} { ${lit2str(literals)} }.`);
    }
    if (head <= 0) throw new Error("Head must be positive");
    
    const negative_literals = literals.filter(x => x < 0).map(Math.abs);
    const positive_literals = literals.filter(x => x > 0);
    
    add_rule([2, head, literals.length, negative_literals.length, bound]
             .concat(negative_literals)
             .concat(positive_literals));
}

function add_weight_rule(head, bound, literals) {
    if (verbose) {
        const weightedLits = lit2str(literals).split(', ').map(x => `${x}=1`).join(', ');
        console.log(`${head2str(head)} :- ${bound} [ ${weightedLits} ].`);
    }
    if (head <= 0) throw new Error("Head must be positive");
    
    const negative_literals = literals.filter(x => x < 0).map(Math.abs);
    const positive_literals = literals.filter(x => x > 0);
    const weights = Array(literals.length).fill(1);
    
    add_rule([5, head, bound, literals.length, negative_literals.length]
             .concat(negative_literals)
             .concat(positive_literals)
             .concat(weights));
}

function optimize_basic_rule(head, literals) {
    if (literals.length === 0) {
        if (single_vars.has(head)) return null;
        single_vars.add(head);
    } else if (head === 1 && literals.length === 1) {
        if (single_vars.has(-literals[0])) return null;
        single_vars.add(-literals[0]);
    } else if (head === 1) {
        for (const x of literals) {
            if (single_vars.has(-x)) return null;
            
            if (single_vars.has(x)) {
                const new_literals = literals.filter(y => y !== x);
                return optimize_basic_rule(head, new_literals);
            }
        }
    }
    return literals;
}

function reset() {
    NUM_BITS = 16;
    BITS = Array.from({length: NUM_BITS}, (_, i) => i);
    
    clasp_rules = [];
    single_vars = new Set();
    last_bool = 1;
    
    TRUE_BOOL = new BoolVar();
    require(TRUE_BOOL);
    FALSE_BOOL = new BoolVar();
    require(FALSE_BOOL.not());
    solution = new Set([TRUE_BOOL.index]);
    
    memo_caches.forEach(cache => {
        for (const key in cache) {
            delete cache[key];
        }
    });
    debug_constraints = [];
}

function require(x, ignored = null) {
    const boolX = new BoolVar(x);
    add_basic_rule(1, [-boolX.index]);
}

function required(x, debug_str) {
    debug_constraints.push([x, debug_str]);
}

function solve() {
    console.log(`Solving ${last_bool} variables, ${clasp_rules.length} rules`);
    
    // 加载WebAssembly版本的clasp
    if (typeof window.ClaspWASM === 'undefined') {
        console.error("ClaspWASM未找到，请加载WebAssembly版本的clasp");
        return false;
    }
    
    // 调用WebAssembly版本的clasp
    try {
        const result = window.ClaspWASM.solve(clasp_rules);
        if (result.satisfiable) {
            solution = new Set(result.model);
            return true;
        } else {
            return false;
        }
    } catch (e) {
        console.error("求解出错:", e);
        return false;
    }
}

// BoolVar类
class BoolVar {
    constructor(val = null) {
        if (val === null) {
            this.index = new_literal();
            add_choice_rule([this.index], []);
        } else if (val === 'internal') {
            this.index = new_literal();
        } else if (val === 'noinit') {
            // 不分配索引
        } else if (val instanceof BoolVar) {
            this.index = val.index;
        } else if (typeof val === 'boolean' || typeof val === 'number') {
            this.index = val ? TRUE_BOOL.index : FALSE_BOOL.index;
        } else if (val instanceof IntVar) {
            const result = val.bits.reduce((a, b) => a.or(b));
            this.index = result.index;
        } else if (val instanceof MultiVar) {
            const result = new BoolVar(val.boolean_op((a, b) => a && b, true));
            this.index = result.index;
        } else {
            throw new TypeError(`Can't convert to BoolVar: ${val} ${typeof val}`);
        }
    }
    
    hash_object() {
        return ['BoolVar', this.index];
    }
    
    value() {
        if (this.index > 0) {
            return solution.has(this.index);
        } else {
            return !solution.has(-this.index);
        }
    }
    
    toString() {
        return String(Number(this.value()));
    }
    
    info() {
        return `BoolVar[${this.index}]=${this}`;
    }
    
    not() {
        const r = new BoolVar('noinit');
        r.index = -this.index;
        return r;
    }
    
    eq(b) {
        b = new BoolVar(b);
        if (b.index === TRUE_BOOL.index) return this;
        if (b.index === FALSE_BOOL.index) return this.not();
        
        const r = new BoolVar('internal');
        add_basic_rule(r.index, [this.index, b.index]);
        add_basic_rule(r.index, [-this.index, -b.index]);
        return r;
    }
    
    ne(b) {
        return this.eq(b).not();
    }
    
    and(b) {
        b = new BoolVar(b);
        if (b.index === TRUE_BOOL.index) return this;
        if (b.index === FALSE_BOOL.index) return FALSE_BOOL;
        
        const r = new BoolVar('internal');
        add_basic_rule(r.index, [this.index, b.index]);
        return r;
    }
    
    or(b) {
        b = new BoolVar(b);
        if (b.index === TRUE_BOOL.index) return TRUE_BOOL;
        if (b.index === FALSE_BOOL.index) return this;
        
        const r = new BoolVar('internal');
        add_basic_rule(r.index, [this.index]);
        add_basic_rule(r.index, [b.index]);
        return r;
    }
    
    xor(b) {
        b = new BoolVar(b);
        if (b.index === TRUE_BOOL.index) return this.not();
        if (b.index === FALSE_BOOL.index) return this;
        
        const r = new BoolVar('internal');
        add_basic_rule(r.index, [this.index, -b.index]);
        add_basic_rule(r.index, [b.index, -this.index]);
        return r;
    }
    
    gt(b) {
        b = new BoolVar(b);
        if (b.index === TRUE_BOOL.index) return FALSE_BOOL;
        if (b.index === FALSE_BOOL.index) return this;
        
        const r = new BoolVar('internal');
        add_basic_rule(r.index, [this.index, -b.index]);
        return r;
    }
    
    lt(b) {
        return new BoolVar(b).gt(this);
    }
    
    ge(b) {
        return this.lt(b).not();
    }
    
    le(b) {
        return this.gt(b).not();
    }
    
    add(other) {
        return new IntVar(this).add(other);
    }
    
    cond(pred, alt) {
        pred = new BoolVar(pred);
        alt = new BoolVar(alt);
        if (this.index === alt.index) return this;
        
        const result = new BoolVar('internal');
        add_basic_rule(result.index, [pred.index, this.index]);
        add_basic_rule(result.index, [-pred.index, alt.index]);
        return result;
    }
}

// 布尔函数
function at_least(n, bools) {
    if (typeof n !== 'number' || !Number.isInteger(n)) {
        throw new Error("n must be an integer");
    }
    
    bools = bools.map(b => new BoolVar(b));
    const result = new BoolVar('internal');
    add_weight_rule(result.index, n, bools.map(b => b.index));
    return result;
}

function at_most(n, bools) {
    return at_least(n + 1, bools).not();
}

function sum_bools(n, bools) {
    return at_least(n, bools).and(at_most(n, bools));
}

// Atom类
class Atom extends BoolVar {
    constructor() {
        super('internal');
    }
    
    prove_if(x) {
        const bx = new BoolVar(x);
        add_basic_rule(this.index, [bx.index]);
    }
}

// 整数功能
function set_bits(n) {
    if (last_bool > 2) {
        throw new Error("Can't change number of bits after defining variables");
    }
    console.log(`Setting integers to ${n} bits`);
    NUM_BITS = n;
    BITS = Array.from({length: NUM_BITS}, (_, i) => i);
}

function set_max_val(n) {
    let i = 0;
    while ((n >> i) !== 0) {
        i++;
    }
    set_bits(i);
}

function constrain_sum(a, b, result) {
    let c = false; // 进位位
    
    // 优化：仅在必要位数处停止
    const max_bit = Math.max(
        ...BITS.filter(i => a.bits[i].index !== FALSE_BOOL.index).map(i => i+1),
        ...BITS.filter(i => b.bits[i].index !== FALSE_BOOL.index).map(i => i+1),
        ...BITS.filter(i => result.bits[i].index !== FALSE_BOOL.index)
    );
    
    for (const i of BITS) {
        const d = a.bits[i].xor(b.bits[i]);
        require(result.bits[i].eq(d.xor(c)));
        
        if (i === max_bit) {
            return result;
        }
        
        c = a.bits[i].and(b.bits[i]).or(d.and(c));
    }
    
    require(c.not()); // 禁止溢出
    return result;
}

// IntVar类
class IntVar {
    constructor(val = null, max_val = null) {
        if (val === null) {
            this.bits = BITS.map(() => new BoolVar());
        } else if (max_val !== null) {
            if (typeof val !== 'number' || typeof max_val !== 'number' ||
                !Number.isInteger(val) || !Number.isInteger(max_val)) {
                throw new Error(`Expected two integers for IntVar() but got: ${val}, ${max_val}`);
            }
            
            if (max_val < val) {
                throw new Error(`Invalid integer range: ${val}, ${max_val}`);
            }
            
            if (max_val >= (1 << NUM_BITS)) {
                throw new Error(`Not enough bits to represent max value: ${max_val}`);
            }
            
            this.bits = BITS.map(i => {
                return (max_val >> i) === 0 ? FALSE_BOOL : new BoolVar();
            });
            
            if (val > 0) require(this.ge(val));
            require(this.le(max_val));
        } else if (val instanceof IntVar) {
            this.bits = val.bits;
        } else if (val instanceof BoolVar) {
            this.bits = [val].concat(BITS.slice(1).map(() => FALSE_BOOL));
        } else if (typeof val === 'number' && Number.isInteger(val) && (val >> NUM_BITS) === 0) {
            this.bits = BITS.map(i => ((val >> i) & 1) ? TRUE_BOOL : FALSE_BOOL);
        } else if (typeof val === 'boolean') {
            this.bits = [val ? TRUE_BOOL : FALSE_BOOL].concat(BITS.slice(1).map(() => FALSE_BOOL));
        } else if (Array.isArray(val)) {
            this.bits = BITS.map(() => new BoolVar());
            require(val.map(x => this.eq(x)).reduce((a, b) => a.or(b)));
        } else {
            throw new TypeError(`Can't convert to IntVar: ${val}`);
        }
    }
    
    hash_object() {
        return ['IntVar'].concat(this.bits.map(b => b.index));
    }
    
    value() {
        return BITS.reduce((sum, i) => {
            return sum + ((this.bits[i].value() ? 1 : 0) << i);
        }, 0);
    }
    
    toString() {
        return String(this.value());
    }
    
    info() {
        return `IntVar[${this.bits.map(b => b.index).reverse().join(',')}]=${this.bits.map(b => b.toString()).reverse().join('')}=${this}`;
    }
    
    eq(x) {
        try {
            x = new IntVar(x);
        } catch (e) {
            return undefined; // NotImplemented
        }
        
        return BITS.map(i => this.bits[i].eq(x.bits[i]))
            .reduce((a, b) => a.and(b));
    }
    
    ne(x) {
        return this.eq(x).not();
    }
    
    add(x) {
        try {
            x = new IntVar(x);
        } catch (e) {
            return undefined; // NotImplemented
        }
        
        // 优化：仅分配必要的位数
        const max_bit = Math.max(
            ...BITS.filter(i => this.bits[i].index !== FALSE_BOOL.index),
            ...BITS.filter(i => x.bits[i].index !== FALSE_BOOL.index),
            -1
        );
        
        const result = new IntVar(0); // 不预先分配布尔值
        result.bits = BITS.map(i => i > max_bit + 1 ? FALSE_BOOL : new BoolVar());
        
        constrain_sum(this, x, result);
        return result;
    }
    
    sub(x) {
        try {
            x = new IntVar(x);
        } catch (e) {
            return undefined; // NotImplemented
        }
        
        const result = new IntVar();
        constrain_sum(result, x, this);
        return result;
    }
    
    gt(x) {
        try {
            x = new IntVar(x);
        } catch (e) {
            return undefined; // NotImplemented
        }
        
        let result = FALSE_BOOL;
        for (let i = NUM_BITS - 1; i >= 0; i--) {
            result = cond(
                this.bits[i].gt(x.bits[i]),
                TRUE_BOOL,
                cond(
                    this.bits[i].lt(x.bits[i]),
                    FALSE_BOOL,
                    result
                )
            );
        }
        return result;
    }
    
    lt(x) {
        return new IntVar(x).gt(this);
    }
    
    ge(x) {
        return this.lt(x).not();
    }
    
    le(x) {
        return this.gt(x).not();
    }
    
    cond(pred, alt) {
        pred = new BoolVar(pred);
        alt = new IntVar(alt);
        
        const result = new IntVar(0); // 不预先分配布尔值
        result.bits = this.bits.map((c, i) => c.cond(pred, alt.bits[i]));
        return result;
    }
    
    lshift(i) {
        if (typeof i !== 'number' || !Number.isInteger(i)) {
            throw new Error("Shift amount must be an integer");
        }
        
        if (i === 0) return this;
        if (i >= NUM_BITS) return new IntVar(0);
        
        const result = new IntVar(0); // 不预先分配布尔值
        result.bits = Array(i).fill(FALSE_BOOL).concat(this.bits.slice(0, -i));
        return result;
    }
    
    rshift(i) {
        if (typeof i !== 'number' || !Number.isInteger(i)) {
            throw new Error("Shift amount must be an integer");
        }
        
        const result = new IntVar(0); // 不预先分配布尔值
        result.bits = this.bits.slice(i).concat(Array(i).fill(FALSE_BOOL));
        return result;
    }
    
    mul(x) {
        x = new IntVar(x);
        let result = new IntVar(0);
        
        for (const i of BITS) {
            result = result.add(cond(x.bits[i], this.lshift(i), 0));
        }
        return result;
    }
}

// 条件函数
function cond(pred, cons, alt) {
    if (typeof pred === 'boolean') {
        return pred ? cons : alt;
    }
    
    pred = new BoolVar(pred);
    if (pred.index === TRUE_BOOL.index) return cons;
    if (pred.index === FALSE_BOOL.index) return alt;
    
    if ((cons instanceof BoolVar || typeof cons === 'boolean') &&
        (alt instanceof BoolVar || typeof alt === 'boolean')) {
        cons = new BoolVar(cons);
        return cons.cond(pred, alt);
    }
    
    if (cons instanceof IntVar || alt instanceof IntVar ||
        (typeof cons === 'number' && typeof alt === 'number')) {
        cons = new IntVar(cons);
        return cons.cond(pred, alt);
    }
    
    // 将其他类型转换为MultiVar
    cons = new MultiVar(cons);
    return cons.cond(pred, alt);
}

// 辅助函数
function require_all_diff(lst) {
    function* choose(items, num) {
        if (items.length < num || num <= 0) {
            yield [];
            return;
        }
        if (items.length === num) {
            yield items;
            return;
        }
        for (const x of choose(items.slice(1), num - 1)) {
            yield [items[0]].concat(x);
        }
        for (const x of choose(items.slice(1), num)) {
            yield x;
        }
    }
    
    for (const [a, b] of Array.from(choose(lst, 2))) {
        require(a.ne(b));
    }
}

function sum_vars(lst) {
    if (lst.length < 2) {
        return lst[0];
    }
    const middle = Math.floor(lst.length / 2);
    return sum_vars(lst.slice(0, middle)).add(sum_vars(lst.slice(middle)));
}

// MultiVar类
class MultiVar {
    constructor(...values) {
        this.vals = {};
        
        if (values.length === 0) {
            return; // 未初始化对象：仅供内部使用
        }
        
        if (values.length === 1) {
            if (values[0] instanceof MultiVar) {
                this.vals = values[0].vals;
            } else {
                this.vals = {[values[0]]: TRUE_BOOL};
            }
            return;
        }
        
        // 检查输入值
        for (const v of values) {
            if (v instanceof BoolVar || v instanceof IntVar || v instanceof MultiVar) {
                throw new Error("Can't convert other variables to MultiVar");
            }
        }
        
        // 为每个唯一值创建布尔变量
        const uniqueValues = [...new Set(values)];
        for (const v of uniqueValues) {
            this.vals[v] = new BoolVar();
        }
        
        // 约束恰好一个值为真
        require(sum_bools(1, Object.values(this.vals)));
    }
    
    hash_object() {
        return ['MultiVar'].concat(
            Object.entries(this.vals).map(([v, b]) => [v, b.index])
        );
    }
    
    value() {
        for (const [v, b] of Object.entries(this.vals)) {
            if (b.value()) {
                return v;
            }
        }
        return '???'; // 未知
    }
    
    toString() {
        return String(this.value());
    }
    
    info() {
        return `MultiVar[${Object.entries(this.vals).map(([v, b]) => 
            `${v}:${b.index}`).join(',')}]=${this}`;
    }
    
    boolean_op(op, b) {
        if (!(b instanceof MultiVar)) {
            b = new MultiVar(b);
        }
        
        // 优化：查看op=true或op=false的项更少
        let true_count = 0;
        let false_count = 0;
        
        for (const [a_val, a_bool] of Object.entries(this.vals)) {
            for (const [b_val, b_bool] of Object.entries(b.vals)) {
                if (op(a_val, b_val)) {
                    true_count++;
                } else {
                    false_count++;
                }
            }
        }
        
        const invert = false_count < true_count;
        const terms = [];
        
        for (const [a_val, a_bool] of Object.entries(this.vals)) {
            for (const [b_val, b_bool] of Object.entries(b.vals)) {
                const term = op(a_val, b_val) ^ invert;
                terms.push(cond(term, a_bool.and(b_bool), FALSE_BOOL));
            }
        }
        
        if (terms.length > 0) {
            const result = terms.reduce((a, b) => a.or(b));
            return new BoolVar(result).xor(invert ? TRUE_BOOL : FALSE_BOOL);
        } else {
            return invert ? TRUE_BOOL : FALSE_BOOL;
        }
    }
    
    generic_op(op, b) {
        if (!(b instanceof MultiVar)) {
            b = new MultiVar(b);
        }
        
        const result = new MultiVar();
        
        for (const [a_val, a_bool] of Object.entries(this.vals)) {
            for (const [b_val, b_bool] of Object.entries(b.vals)) {
                const result_val = op(a_val, b_val);
                const result_bool = a_bool.and(b_bool);
                
                if (result_val in result.vals) {
                    result.vals[result_val] = result.vals[result_val].or(result_bool);
                } else {
                    result.vals[result_val] = result_bool;
                }
            }
        }
        
        return result;
    }
    
    eq(b) {
        return this.boolean_op((x, y) => x == y, b);
    }
    
    ne(b) {
        return this.eq(b).not();
    }
    
    add(b) {
        return this.generic_op((x, y) => x + y, b);
    }
    
    sub(b) {
        return this.generic_op((x, y) => x - y, b);
    }
    
    mul(b) {
        return this.generic_op((x, y) => x * y, b);
    }
    
    div(b) {
        return this.generic_op((x, y) => x / y, b);
    }
    
    gt(b) {
        return this.boolean_op((x, y) => x > y, b);
    }
    
    lt(b) {
        return new MultiVar(b).gt(this);
    }
    
    ge(b) {
        return this.lt(b).not();
    }
    
    le(b) {
        return this.gt(b).not();
    }
    
    getItem(b) {
        return this.generic_op((x, y) => x[y], b);
    }
    
    cond(pred, alt) {
        pred = new BoolVar(pred);
        alt = new MultiVar(alt);
        
        const result = new MultiVar();
        
        for (const [v, b] of Object.entries(this.vals)) {
            result.vals[v] = pred.and(b);
        }
        
        for (const [v, b] of Object.entries(alt.vals)) {
            if (v in result.vals) {
                result.vals[v] = result.vals[v].or(pred.not().and(b));
            } else {
                result.vals[v] = pred.not().and(b);
            }
        }
        
        return result;
    }
}

function var_in(v, lst) {
    return lst.map(x => v.eq(x)).reduce((a, b) => a.or(b));
}

// 添加操作符方法
BoolVar.prototype.eq = memoized_symmetric(BoolVar.prototype.eq);
BoolVar.prototype.and = memoized_symmetric(BoolVar.prototype.and);
BoolVar.prototype.or = memoized_symmetric(BoolVar.prototype.or);
BoolVar.prototype.xor = memoized_symmetric(BoolVar.prototype.xor);
BoolVar.prototype.gt = memoized(BoolVar.prototype.gt);
BoolVar.prototype.add = memoized_symmetric(BoolVar.prototype.add);

IntVar.prototype.eq = memoized_symmetric(IntVar.prototype.eq);
IntVar.prototype.add = memoized_symmetric(IntVar.prototype.add);
IntVar.prototype.sub = memoized(IntVar.prototype.sub);
IntVar.prototype.gt = memoized(IntVar.prototype.gt);
IntVar.prototype.lshift = memoized(IntVar.prototype.lshift);
IntVar.prototype.rshift = memoized(IntVar.prototype.rshift);
IntVar.prototype.mul = memoized_symmetric(IntVar.prototype.mul);

MultiVar.prototype.eq = memoized_symmetric(MultiVar.prototype.eq);
MultiVar.prototype.add = memoized_symmetric(MultiVar.prototype.add);
MultiVar.prototype.sub = memoized(MultiVar.prototype.sub);
MultiVar.prototype.mul = memoized(MultiVar.prototype.mul);
MultiVar.prototype.div = memoized(MultiVar.prototype.div);
MultiVar.prototype.gt = memoized(MultiVar.prototype.gt);
MultiVar.prototype.getItem = memoized(MultiVar.prototype.getItem);

// 初始化
reset();

// 导出模块
window.BoolVar = BoolVar;
window.IntVar = IntVar;
window.MultiVar = MultiVar;
window.Atom = Atom;
window.reset = reset;
window.require = require;
window.required = required;
window.set_bits = set_bits;
window.set_max_val = set_max_val;
window.set_verbose = set_verbose;
window.solve = solve;
window.cond = cond;
window.require_all_diff = require_all_diff;
window.sum_vars = sum_vars;
window.at_least = at_least;
window.at_most = at_most;
window.sum_bools = sum_bools;
window.var_in = var_in;