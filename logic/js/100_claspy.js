let CLASP_COMMAND = 'clasp --sat-prepro --eq=1 --trans-ext=dynamic';
let verbose = false;

function setVerbose(b = true) {verbose = b;}

let lastUpdate = Date.now() / 1000;
function needUpdate() {
    const now = Date.now() / 1000;
    if (now - lastUpdate > 2) {
        lastUpdate = now;
        return true;
    }
    return false;
}

function hashObject(x) {
    if (x && typeof x.hashObject === 'function') {
        return x.hashObject();} 
        else {return x;
    }
}

let memoCaches = [];

function memoized(func) {
    const cache = {};
    memoCaches.push(cache);
    
    return function(...args) {
        try {
            const key = JSON.stringify(args.map(hashObject));
            if (key in cache) {
                return cache[key];
            }
            const value = func(...args);
            cache[key] = value;
            return value;
        } catch (error) {
            return func(...args);
        }
    };
}

function memoizedSymmetric(func) {
    const cache = {};
    memoCaches.push(cache);
    
    return function(...args) {
        try {
            const key = JSON.stringify([...args].map(hashObject).sort());
            if (key in cache) {
                return cache[key];
            }
            const value = func(...args);
            cache[key] = value;
            return value;
        } catch (error) {
            return func(...args);
        }
    };
}

let TRUE_BOOL = null;
let FALSE_BOOL = null;
let lastBool = null;
let solution = null;
let debugConstraints = null;
let claspRules = null;
let singleVars = null;
let NUM_BITS = null;
let BITS = null;

function reset() {
    NUM_BITS = 16;
    BITS = Array.from({length: NUM_BITS}, (_, i) => i);
    claspRules = [];
    singleVars = new Set();
    lastBool = 1;  
    TRUE_BOOL = new BoolVar();
    require(TRUE_BOOL);
    FALSE_BOOL = new BoolVar(~TRUE_BOOL);
    solution = new Set([TRUE_BOOL.index]);
    memoCaches.forEach(cache => {
        Object.keys(cache).forEach(key => delete cache[key]);
    });
    debugConstraints = [];
}

function newLiteral() {
    lastBool += 1;
    return lastBool;
}

function require(x, ignored = null) {
    x = new BoolVar(x);
    addBasicRule(1, [-x.index]); 
}

function required(x, debugStr) {
    debugConstraints.push([x, debugStr]);
}

function addRule(vals) {
    claspRules.push(vals);
    if (needUpdate()) {
        console.log(`${claspRules.length} rules`);
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

function addBasicRule(head, literals) {
    if (verbose) {
        if (literals.length === 0) console.log(`${head2str(head)}.`);
        else console.log(`${head2str(head)} :- ${lit2str(literals)}.`);
    }
    
    assert(head > 0);
    literals = optimizeBasicRule(head, literals);
    
    if (literals === null) {  
        if (verbose) console.log('#opt');
        return;
    }
    
    if (verbose) {
        if (literals.length === 0) console.log(`#opt ${head2str(head)}.`);
        else console.log(`#opt ${head2str(head)} :- ${lit2str(literals)}.`);
    }
    
    const negativeLiterals = literals.filter(x => x < 0).map(Math.abs);
    const positiveLiterals = literals.filter(x => x > 0);
    
    addRule([1, head, literals.length, negativeLiterals.length]
        .concat(negativeLiterals)
        .concat(positiveLiterals));
}

function addChoiceRule(heads, literals) {
    if (verbose) {
        if (literals.length === 0) {
            console.log(`{ ${lit2str(heads)} }.`);
        } else {
            console.log(`{ ${lit2str(heads)} } :- ${lit2str(literals)}`);
        }
    }
    
    heads.forEach(i => assert(i > 0));
    const negativeLiterals = literals.filter(x => x < 0).map(Math.abs);
    const positiveLiterals = literals.filter(x => x > 0);
    addRule([3, heads.length].concat(heads)
        .concat([literals.length, negativeLiterals.length])
        .concat(negativeLiterals)
        .concat(positiveLiterals));
}

function addConstraintRule(head, bound, literals) {
    if (verbose) {
        console.log(`${head2str(head)} :- ${bound} { ${lit2str(literals)} }.`);
    }
    
    assert(head > 0);
    const negativeLiterals = literals.filter(x => x < 0).map(Math.abs);
    const positiveLiterals = literals.filter(x => x > 0);
    
    addRule([2, head, literals.length, negativeLiterals.length, bound]
        .concat(negativeLiterals)
        .concat(positiveLiterals));
}

function addWeightRule(head, bound, literals) {
    if (verbose) {
        console.log(`${head2str(head)} :- ${bound} [ ${lit2str(literals).split(', ').map(x => x + '=1').join(', ')} ].`);
    }
    
    assert(head > 0);
    const negativeLiterals = literals.filter(x => x < 0).map(Math.abs);
    const positiveLiterals = literals.filter(x => x > 0);
    const weights = Array(literals.length).fill(1);
    
    addRule([5, head, bound, literals.length, negativeLiterals.length]
        .concat(negativeLiterals)
        .concat(positiveLiterals)
        .concat(weights));
}

//基本规则
function optimizeBasicRule(head, literals) {
    if (literals.length === 0) { 
        if (singleVars.has(head)) return null;
        singleVars.add(head);
    } else if (head === 1 && literals.length === 1) {  
        if (singleVars.has(-literals[0])) return null;
        singleVars.add(-literals[0]);
    } else if (head === 1) {  
        for (const x of literals) {
            // 如果字面量是假的，子句是不必要的
            if (singleVars.has(-x)) {
                return null;
            }
            // 如果字面量是真的，字面量是不必要的
            if (singleVars.has(x)) {
                const newLiterals = literals.filter(y => y !== x);
                return optimizeBasicRule(head, newLiterals);
            }
        }
    }
    return literals;
}

// 求解开始时间
const startTime = Date.now() / 1000;

// 求解函数
function solve() {
    console.log(`正在求解 ${lastBool} 个变量, ${claspRules.length} 条规则`);
    return new Promise((resolve, reject) => {
        import('./clasp.js').then(ClaspModule => {
            ClaspModule.onRuntimeInitialized = () => {
                try {
                    const inputData = prepareClaspInput(claspRules);
                    const result = ClaspModule.solve(inputData);
                    const foundSolution = processSolution(result);
                    console.log(foundSolution ? "SATISFIABLE" : "UNSATISFIABLE");
                    console.log();
                    console.log(`总用时: ${((Date.now() / 1000) - startTime).toFixed(2)}秒`);
                    console.log();
                    if (solution.size && debugConstraints.length) {
                        for (const [x, s] of debugConstraints) {
                            if (!x.value()) {
                                console.log(`约束条件失败: ${s}`);
                            }
                        }
                        console.log();
                    }
                    
                    lastUpdate = Date.now() / 1000;
                    resolve(foundSolution);
                } catch (error) {
                    console.error("WebAssembly求解器错误:", error);
                    reject(error);
                }
            };
        }).catch(error => {
            console.error("加载WebAssembly模块失败:", error);
            reject(error);
        });
    });
}

// 准备clasp输入数据的辅助函数
function prepareClaspInput(rules) {
    // 将JavaScript格式的规则转换为clasp可接受的格式
    // 这取决于您的WebAssembly模块接口设计
    const inputStr = rules.map(rule => rule.join(' ')).join('\n');
    return inputStr;
}

// 处理clasp输出结果的辅助函数
function processSolution(result) {
    if (result.status === 'SATISFIABLE') {
        solution = new Set([TRUE_BOOL.index]);
        result.model.forEach(literal => {
            if (literal > 0) {
                solution.add(literal);
            }
        });
        return true;
    }
    return false;
}

// 断言函数
function assert(condition) {
    if (!condition) {
        throw new Error("Assertion failed");
    }
}

// ==============================================================================
// ================================= 布尔变量 ===================================
// ==============================================================================

class BoolVar {
    constructor(val = null) {
        if (val === null) {
            this.index = newLiteral();
            addChoiceRule([this.index], []);  
        } else if (val === 'internal') { 
            this.index = newLiteral();
        } else if (val === 'noinit') {  
            return;
        } else if (val instanceof BoolVar) {
            this.index = val.index;
        } else if (typeof val === 'boolean' || typeof val === 'number') {
            this.index = val ? TRUE_BOOL.index : FALSE_BOOL.index;
        } else if (val instanceof IntVar) {
            // 如果任意位为非零则为真
            const result = val.bits.reduce((a, b) => a | b);
            this.index = result.index;
        } else if (val instanceof MultiVar) {
            // 使用boolean_op转换val为布尔值，因为没有一元运算符，
            // 并且'val != False'效率低
            const result = new BoolVar(val.booleanOp((a, b) => a && b, true));
            this.index = result.index;
        } else if (val instanceof BoolVar && val.index < 0) {
            this.index = val.index;
        } else {
            throw new TypeError(`Can't convert to BoolVar: ${val} ${typeof val}`);
        }
    }
    
    hashObject() {return ['BoolVar', this.index];}
    
    value() {
        if (this.index > 0) {
            return solution.has(this.index);
        } else {
            return !solution.has(-this.index);
        }
    }
    
    toString() {return String(Number(this.value()));}
    info() {return `BoolVar[${this.index}]=${this}`;}
    valueOf() {return this.value();}
}

// 布尔变量逻辑操作
BoolVar.prototype.not = function() {
    const r = new BoolVar('noinit');
    r.index = -this.index;
    return r;
};

// 等于
BoolVar.prototype.eq = memoizedSymmetric(function(b) {
    b = new BoolVar(b);
    if (b.index === TRUE_BOOL.index) return this;  // 优化
    if (b.index === FALSE_BOOL.index) return this.not();  // 优化
    
    const r = new BoolVar('internal');
    addBasicRule(r.index, [this.index, b.index]);
    addBasicRule(r.index, [-this.index, -b.index]);
    return r;
});

// 不等于
BoolVar.prototype.ne = function(b) {
    return this.eq(b).not();
};

// 与
BoolVar.prototype.and = memoizedSymmetric(function(b) {
    b = new BoolVar(b);
    if (b.index === TRUE_BOOL.index) return this;  
    if (b.index === FALSE_BOOL.index) return FALSE_BOOL; 
    
    const r = new BoolVar('internal');
    addBasicRule(r.index, [this.index, b.index]);
    return r;
});

// 或
BoolVar.prototype.or = memoizedSymmetric(function(b) {
    b = new BoolVar(b);
    if (b.index === TRUE_BOOL.index) return TRUE_BOOL;  
    if (b.index === FALSE_BOOL.index) return this; 
    
    const r = new BoolVar('internal');
    addBasicRule(r.index, [this.index]);
    addBasicRule(r.index, [b.index]);
    return r;
});

// 异或
BoolVar.prototype.xor = memoizedSymmetric(function(b) {
    b = new BoolVar(b);
    if (b.index === TRUE_BOOL.index) return this.not();  
    if (b.index === FALSE_BOOL.index) return this;  
    
    const r = new BoolVar('internal');
    addBasicRule(r.index, [this.index, -b.index]);
    addBasicRule(r.index, [b.index, -this.index]);
    return r;
});

// 大于
BoolVar.prototype.gt = memoized(function(b) {
    b = new BoolVar(b);
    if (b.index === TRUE_BOOL.index) return FALSE_BOOL;  
    if (b.index === FALSE_BOOL.index) return this;
    
    const r = new BoolVar('internal');
    addBasicRule(r.index, [this.index, -b.index]);
    return r;
});

// 小于
BoolVar.prototype.lt = function(b) {
    return new BoolVar(b).gt(this);
};

// 大于等于
BoolVar.prototype.ge = function(b) {
    return this.lt(b).not();
};

// 小于等于
BoolVar.prototype.le = function(b) {
    return this.gt(b).not();
};

// 加法
BoolVar.prototype.add = memoizedSymmetric(function(other) {
    return new IntVar(this).add(other);
});

// 条件
BoolVar.prototype.cond = function(pred, alt) {
    pred = new BoolVar(pred);
    alt = new BoolVar(alt);
    if (this.index === alt.index) return this; 
    
    const result = new BoolVar('internal');
    addBasicRule(result.index, [pred.index, this.index]);
    addBasicRule(result.index, [-pred.index, alt.index]);
    return result;
};

// 一些运算符别名，方便使用
BoolVar.prototype.valueOf = function() { return this.value(); };

// 布尔变量的辅助函数
function atLeast(n, bools) {
    if (typeof n !== 'number') {
        throw new Error("n must be an integer");
    }
    
    bools = bools.map(b => new BoolVar(b));
    const result = new BoolVar('internal');
    addWeightRule(result.index, n, bools.map(x => x.index));
    return result;
}

function atMost(n, bools) {
    return atLeast(n + 1, bools).not();
}

function sumBools(n, bools) {
    return atLeast(n, bools).and(atMost(n, bools));
}

// ==============================================================================
// ================================== 原子变量 ==================================
// ==============================================================================

class Atom extends BoolVar {
    constructor() {
        super('internal');
    }
    
    proveIf(x) {
        x = new BoolVar(x);
        addBasicRule(this.index, [x.index]);
    }
}

// ==============================================================================
// ================================== 整数变量 ==================================
// ==============================================================================

function setBits(n) {
    if (lastBool > 2) { 
        throw new Error("Can't change number of bits after defining variables");
    }
    
    console.log(`Setting integers to ${n} bits`);
    NUM_BITS = n;
    BITS = Array.from({length: NUM_BITS}, (_, i) => i);
}

function setMaxVal(n) {
    let i = 0;
    while ((n >> i) !== 0) {
        i += 1;
    }
    setBits(i);
}

function constrainSum(a, b, result) {
    let c = false;
    const maxBit = Math.max(
        ...BITS.filter(i => a.bits[i].index !== FALSE_BOOL.index).map(i => i + 1),
        ...BITS.filter(i => b.bits[i].index !== FALSE_BOOL.index).map(i => i + 1),
        ...BITS.filter(i => result.bits[i].index !== FALSE_BOOL.index)
    );
    
    for (const i of BITS) {
        const d = a.bits[i].xor(b.bits[i]);
        require(result.bits[i].eq(d.xor(new BoolVar(c))));
        
        if (i === maxBit) {
            return result;
        }
        
        c = a.bits[i].and(b.bits[i]).or(d.and(new BoolVar(c)));
    }
    
    require(new BoolVar(c).not()); 
    return result;
}

class IntVar {
    constructor(val = null, maxVal = null) {
        if (val === null) {
            this.bits = BITS.map(() => new BoolVar());
        } else if (maxVal !== null) {
            if (typeof val !== 'number' || typeof maxVal !== 'number') {
                throw new Error(`Expected two integers for IntVar() but got: ${val}, ${maxVal}`);
            }
            if (maxVal < val) {
                throw new Error(`Invalid integer range: ${val}, ${maxVal}`);
            }
            if (maxVal >= (1 << NUM_BITS)) {
                throw new Error(`Not enough bits to represent max value: ${maxVal}`);
            }
            
            this.bits = BITS.map(i => {
                return (maxVal >> i) === 0 ? FALSE_BOOL : new BoolVar();
            });
            
            if (val > 0) require(this.ge(val));
            require(this.le(maxVal));
        } else if (val instanceof IntVar) {
            this.bits = val.bits;
        } else if (val instanceof BoolVar) {
            this.bits = [val].concat(BITS.slice(1).map(() => FALSE_BOOL));
        } else if (typeof val === 'number' && (val >> NUM_BITS) === 0) {
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
    
    hashObject() {
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
    
    valueOf() {
        return this.value();
    }
}

// 整数变量操作
IntVar.prototype.eq = memoizedSymmetric(function(x) {
    try {
        x = new IntVar(x);
    } catch (e) {
        return undefined;  
    }
    
    return BITS.map(i => this.bits[i].eq(x.bits[i]))
        .reduce((a, b) => a.and(b));
});

IntVar.prototype.ne = function(x) {
    return this.eq(x).not();
};

IntVar.prototype.add = memoizedSymmetric(function(x) {
    try {x = new IntVar(x);} catch (e) {
        return undefined; 
    }
    
    const maxBit = Math.max(
        ...BITS.filter(i => this.bits[i].index !== FALSE_BOOL.index),
        ...BITS.filter(i => x.bits[i].index !== FALSE_BOOL.index),
        -1
    );
    
    const result = new IntVar(0);
    result.bits = BITS.map(i => i > maxBit + 1 ? FALSE_BOOL : new BoolVar());
    
    constrainSum(this, x, result);
    return result;
});

IntVar.prototype.sub = memoized(function(x) {
    try {
        x = new IntVar(x);
    } catch (e) {
        return undefined; 
    }
    
    const result = new IntVar();
    constrainSum(result, x, this);
    return result;
});

IntVar.prototype.gt = memoized(function(x) {
    try {x = new IntVar(x);
    } catch (e) {return undefined;}
    let result = FALSE_BOOL;
    for (let i = BITS.length - 1; i >= 0; i--) {
        result = cond(this.bits[i].gt(x.bits[i]), TRUE_BOOL,
                   cond(this.bits[i].lt(x.bits[i]), FALSE_BOOL, result));
    }
    return result;
});

IntVar.prototype.lt = function(x) {
    return new IntVar(x).gt(this);
};

IntVar.prototype.ge = function(x) {
    return this.lt(x).not();
};

IntVar.prototype.le = function(x) {
    return this.gt(x).not();
};

IntVar.prototype.cond = function(pred, alt) {
    pred = new BoolVar(pred);
    alt = new IntVar(alt);
    
    const result = new IntVar(0);
    result.bits = this.bits.map((c, i) => c.cond(pred, alt.bits[i]));
    return result;
};

IntVar.prototype.lshift = memoized(function(i) {
    if (typeof i !== 'number') {
        throw new Error("Shift amount must be a number");
    }
    
    if (i === 0) return this;
    if (i >= NUM_BITS) return new IntVar(0);
    
    const result = new IntVar(0);
    result.bits = Array(i).fill(FALSE_BOOL).concat(this.bits.slice(0, -i));
    return result;
});

IntVar.prototype.rshift = memoized(function(i) {
    if (typeof i !== 'number') {
        throw new Error("Shift amount must be a number");
    }
    
    const result = new IntVar(0);
    result.bits = this.bits.slice(i).concat(Array(i).fill(FALSE_BOOL));
    return result;
});

IntVar.prototype.mul = memoizedSymmetric(function(x) {
    x = new IntVar(x);
    let result = new IntVar(0);
    
    for (const i of BITS) {
        result = result.add(cond(x.bits[i], this.lshift(i), 0));
    }
    
    return result;
});

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
    
    cons = new MultiVar(cons);
    return cons.cond(pred, alt);
}

// 要求所有不同的约束
function requireAllDiff(lst) {
    function* choose(items, num) {
        if (items.length < num || num <= 0) {
            yield items.slice(0, 0);
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

function sumVars(lst) {
    if (lst.length < 2) {
        return lst[0];
    }
    const middle = Math.floor(lst.length / 2);
    return sumVars(lst.slice(0, middle)).add(sumVars(lst.slice(middle)));
}

// ==============================================================================
// ================================= 多值变量 ===================================
// ==============================================================================

class MultiVar {
    constructor(...values) {
        this.vals = {};
        
        if (values.length === 0) {
            return;  
        }
        
        if (values.length === 1) {
            if (values[0] instanceof MultiVar) {
                this.vals = values[0].vals;
            } else {
                this.vals = {[values[0]]: TRUE_BOOL};
            }
            return;
        }
        
        for (const v of values) {
            if (v instanceof BoolVar || v instanceof IntVar || v instanceof MultiVar) {
                throw new Error("Can't convert other variables to MultiVar");
            }
        }
        
        const uniqueValues = Array.from(new Set(values));
        for (const v of uniqueValues) {
            this.vals[v] = new BoolVar();
        }
        
        require(sumBools(1, Object.values(this.vals)));
    }
    
    hashObject() {
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
        return '???';  
    }
    
    toString() {
        return String(this.value());
    }
    
    info() {
        return `MultiVar[${Object.entries(this.vals)
            .map(([v, b]) => `${v}:${b.index}`).join(',')}]=${this}`;
    }
    
    booleanOp(op, b) {
        if (!(b instanceof MultiVar)) {
            b = new MultiVar(b);
        }
        
        let trueCount = 0;
        let falseCount = 0;
        
        for (const [aVal, aBool] of Object.entries(this.vals)) {
            for (const [bVal, bBool] of Object.entries(b.vals)) {
                if (op(aVal, bVal)) {
                    trueCount += 1;
                } else {
                    falseCount += 1;
                }
            }
        }
        
        const invert = falseCount < trueCount;
        const terms = [];
        
        for (const [aVal, aBool] of Object.entries(this.vals)) {
            for (const [bVal, bBool] of Object.entries(b.vals)) {
                const term = op(aVal, bVal) ^ invert;
                terms.push(cond(term, aBool.and(bBool), false));
            }
        }
        
        if (terms.length) {
            const result = terms.reduce((a, b) => a.or(b));
            return new BoolVar(result).xor(new BoolVar(invert));
        } else {
            return FALSE_BOOL.xor(new BoolVar(invert));
        }
    }
    
    genericOp(op, b) {
        if (!(b instanceof MultiVar)) {
            b = new MultiVar(b);
        }
        
        const result = new MultiVar();
        
        for (const [aVal, aBool] of Object.entries(this.vals)) {
            for (const [bVal, bBool] of Object.entries(b.vals)) {
                const resultVal = op(aVal, bVal);
                const resultBool = aBool.and(bBool);
                
                if (resultVal in result.vals) {
                    result.vals[resultVal] = result.vals[resultVal].or(resultBool);
                } else {
                    result.vals[resultVal] = resultBool;
                }
            }
        }
        
        return result;
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

MultiVar.prototype.eq = memoizedSymmetric(function(b) {return this.booleanOp((x, y) => x == y, b);});

MultiVar.prototype.ne = function(b) {
    return this.eq(b).not();
};

MultiVar.prototype.add = memoizedSymmetric(function(b) {
    return this.genericOp((x, y) => Number(x) + Number(y), b);
});

MultiVar.prototype.sub = memoized(function(b) {
    return this.genericOp((x, y) => Number(x) - Number(y), b);
});

MultiVar.prototype.mul = memoized(function(b) {
    return this.genericOp((x, y) => Number(x) * Number(y), b);
});

MultiVar.prototype.div = memoized(function(b) {
    return this.genericOp((x, y) => Number(x) / Number(y), b);
});

MultiVar.prototype.gt = memoized(function(b) {
    return this.booleanOp((x, y) => x > y, b);
});

MultiVar.prototype.lt = function(b) {
    return new MultiVar(b).gt(this);
};

MultiVar.prototype.ge = function(b) {
    return this.lt(b).not();
};

MultiVar.prototype.le = function(b) {
    return this.gt(b).not();
};

MultiVar.prototype.getItem = memoized(function(b) {
    return this.genericOp((x, y) => x[y], b);
});

function varIn(v, lst) {
    return lst.map(x => v.eq(x)).reduce((a, b) => a.or(b));
}

reset();
module.exports = {
    BoolVar,
    IntVar,
    MultiVar,
    Atom,
    reset,
    solve,
    require,
    setBits,
    setMaxVal,
    setVerbose,
    atLeast,
    atMost,
    sumBools,
    cond,
    requireAllDiff,
    sumVars,
    varIn
};