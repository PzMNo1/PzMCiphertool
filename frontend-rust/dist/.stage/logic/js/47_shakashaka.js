window.solveShakashaka = function (puzzle) {
    const R = puzzle.rows;
    const C = puzzle.cols;
    const clues = [];
    const grid = new Int8Array(R * C);
    grid.fill(-1);

    for (let i = 0; i < R * C; i++) {
        if (puzzle.grid[i] !== -1) {
            grid[i] = 0; // Black
            clues.push({
                r: Math.floor(i / C),
                c: i % C,
                val: puzzle.grid[i]
            });
        }
    }
    function isValid(r, c, val) {
        // Boundary checks
        if (val === 2 && (r === R - 1 || c === C - 1)) return false;
        if (val === 3 && (r === R - 1 || c === 0)) return false;
        if (val === 4 && (r === 0 || c === C - 1)) return false;
        if (val === 5 && (r === 0 || c === 0)) return false;

        // TL Rules
        if (c >= 1 && grid[r * C + c - 1] === 2) {
            if (!((r >= 1 && grid[(r - 1) * C + c] === 2 && val === 1) || val === 3)) return false;
        }
        if (r === 0 && c >= 1 && grid[c - 1] === 2) {
            if (val !== 3) return false;
        }
        if (r >= 1 && grid[(r - 1) * C + c] === 2) {
            if (!((c >= 1 && grid[r * C + c - 1] === 2 && val === 1) || val === 4)) return false;
        }
        if (r >= 1 && c === 0 && grid[(r - 1) * C] === 2) {
            if (val !== 4) return false;
        }

        // TR Rules
        if (val === 3) {
            if (r >= 1 && c >= 1) {
                if (!((grid[(r - 1) * C + c - 1] === 3 && grid[r * C + c - 1] === 1) || grid[r * C + c - 1] === 2)) return false;
            }
            if (r === 0 && c >= 1) {
                if (grid[c - 1] !== 2) return false;
            }
        }
        if (r >= 1 && grid[(r - 1) * C + c] === 3) {
            if (c < C - 1) {
                if (!(val === 1 || val === 5)) return false;
            } else {
                if (val !== 5) return false;
            }
        }

        // BL Rules
        if (r >= 1 && c >= 1 && grid[(r - 1) * C + c - 1] === 4 && grid[(r - 1) * C + c] === 1) {
            if (val !== 4) return false;
        }
        if (r === R - 1 && c >= 1 && grid[r * C + c - 1] === 4) {
            if (val !== 5) return false;
        }
        if (val === 4) {
            if (r >= 1 && c >= 1) {
                if (!((grid[(r - 1) * C + c - 1] === 4 && grid[(r - 1) * C + c] === 1) || grid[(r - 1) * C + c] === 2)) return false;
            }
            if (r >= 1 && c === 0) {
                if (grid[(r - 1) * C] !== 2) return false;
            }
        }

        // BR Rules
        if (r >= 1 && c < C - 1 && grid[(r - 1) * C + c + 1] === 5 && grid[(r - 1) * C + c] === 1) {
            if (val !== 5) return false;
        }
        if (r === R - 1 && val === 5 && c >= 1) {
            if (grid[r * C + c - 1] !== 4) return false;
        }
        if (val === 5) {
            if (r >= 1 && c < C - 1) {
                if (!((grid[(r - 1) * C + c + 1] === 5 && grid[(r - 1) * C + c] === 1) || grid[(r - 1) * C + c] === 3)) return false;
            }
            if (r >= 1 && c === C - 1) {
                if (grid[(r - 1) * C + C - 1] !== 3) return false;
            }
        }

        // Diagonal Rectangle 2x2 Rules
        if (r >= 1 && c >= 1 && grid[(r - 1) * C + c - 1] === 1 && val === 1) {
            let eq1 = (grid[(r - 1) * C + c] === 1 || grid[(r - 1) * C + c] === 4);
            let eq2 = (grid[r * C + c - 1] === 1 || grid[r * C + c - 1] === 3);
            if (eq1 !== eq2) return false;
        }
        if (r >= 1 && c >= 1 && grid[(r - 1) * C + c] === 1 && grid[r * C + c - 1] === 1) {
            let eq1 = (grid[(r - 1) * C + c - 1] === 1 || grid[(r - 1) * C + c - 1] === 5);
            let eq2 = (val === 1 || val === 2);
            if (eq1 !== eq2) return false;
        }

        // Grid-aligned Rectangles
        if (r >= 1 && c >= 1 && grid[r * C + c - 1] === 1 && grid[(r - 1) * C + c - 1] === 1 && val === 1) {
            if (!(grid[(r - 1) * C + c] === 1 || grid[(r - 1) * C + c] === 3)) return false;
        }
        if (r >= 1 && c >= 1 && val === 1 && grid[(r - 1) * C + c] === 1 && grid[r * C + c - 1] === 1) {
            if (!(grid[(r - 1) * C + c - 1] === 1 || grid[(r - 1) * C + c - 1] === 2)) return false;
        }
        if (r >= 1 && c >= 1 && grid[(r - 1) * C + c - 1] === 1 && grid[r * C + c - 1] === 1 && grid[(r - 1) * C + c] === 1) {
            if (!(val === 1 || val === 5)) return false;
        }
        if (r >= 1 && c >= 1 && grid[(r - 1) * C + c] === 1 && val === 1 && grid[(r - 1) * C + c - 1] === 1) {
            if (!(grid[r * C + c - 1] === 1 || grid[r * C + c - 1] === 4)) return false;
        }

        // Clue checking
        for (let ci = 0; ci < clues.length; ci++) {
            let cl = clues[ci];
            if (cl.val === 5) continue;

            // only check clues that are adjacent to (r,c) to save time?
            // Actually checking all is fast, but let's optimize
            if (Math.abs(cl.r - r) + Math.abs(cl.c - c) !== 1) {
                // Not adjacent, but maybe we still need to check if we are the LAST neighbor?
                // Actually, if we just check ALL clues, we prune early.
            }

            let assigned = 0;
            let triangles = 0;
            let possible = 0;

            if (cl.r > 0) {
                possible++;
                let n = grid[(cl.r - 1) * C + cl.c];
                if (n !== -1) {
                    assigned++;
                    if (n >= 2 && n <= 5) triangles++;
                }
            }
            if (cl.r < R - 1) {
                possible++;
                let n = grid[(cl.r + 1) * C + cl.c];
                if (n !== -1) {
                    assigned++;
                    if (n >= 2 && n <= 5) triangles++;
                }
            }
            if (cl.c > 0) {
                possible++;
                let n = grid[cl.r * C + cl.c - 1];
                if (n !== -1) {
                    assigned++;
                    if (n >= 2 && n <= 5) triangles++;
                }
            }
            if (cl.c < C - 1) {
                possible++;
                let n = grid[cl.r * C + cl.c + 1];
                if (n !== -1) {
                    assigned++;
                    if (n >= 2 && n <= 5) triangles++;
                }
            }

            if (triangles > cl.val) return false;
            if (triangles + (possible - assigned) < cl.val) return false;
        }

        return true;
    }

    const solutions = [];
    const startTime = performance.now();
    let timeout = false;

    // We can precompute the indices to assign (skip fixed black cells)
    const indicesToAssign = [];
    for (let i = 0; i < R * C; i++) {
        if (grid[i] === -1) {
            indicesToAssign.push(i);
        }
    }

    function solve(idx) {
        if (solutions.length >= 2 || timeout) return;
        if (performance.now() - startTime > 3000) {
            timeout = true;
            return;
        }

        if (idx === indicesToAssign.length) {
            solutions.push(Array.from(grid));
            return;
        }

        let i = indicesToAssign[idx];
        let r = Math.floor(i / C);
        let c = i % C;

        for (let v = 1; v <= 5; v++) {
            grid[i] = v;
            if (isValid(r, c, v)) {
                solve(idx + 1);
            }
            grid[i] = -1; // backtrack
        }
    }

    solve(0);

    return {
        solutions: solutions,
        timeout: timeout
    };
};
