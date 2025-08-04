from .claspy import *
from . import utils
from .utils.encoding import *

def encode(string):
    return utils.encode(string, outside_clues = '1001')

def solve(E):
    
    assert E.R == E.C, 'Doppelblock puzzles must be square'
    n = E.R
    
    reset()
    set_max_val((n-2)*(n-1)//2) # the maximum sum of numbers in a row / col
    
    # make a nxn Latin square
    numbers_solver = utils.RectangularGridNumbersSolver(n, n, 1, n)
    numbers_solver.rows_and_cols()
    
    # the "numbers" n-1 and n represent shaded blocks
    shading_symbols = [n-1, n]
    
    for r in E.left:
        has_seen_first_shaded, has_seen_second_shaded = False, False
        s = IntVar(0)
        for c in range(n):
            s += cond(~var_in(numbers_solver.grid[r][c], shading_symbols) & has_seen_first_shaded & ~has_seen_second_shaded, numbers_solver.grid[r][c], 0)
            has_seen_second_shaded |= has_seen_first_shaded & var_in(numbers_solver.grid[r][c], shading_symbols)
            has_seen_first_shaded |= var_in(numbers_solver.grid[r][c], shading_symbols)
        require(s == int(E.left[r]))
    
    for c in E.top:
        has_seen_first_shaded, has_seen_second_shaded = False, False
        s = IntVar(0)
        for r in range(n):
            s += cond(~var_in(numbers_solver.grid[r][c], shading_symbols) & has_seen_first_shaded & ~has_seen_second_shaded, numbers_solver.grid[r][c], 0)
            has_seen_second_shaded |= has_seen_first_shaded & var_in(numbers_solver.grid[r][c], shading_symbols)
            has_seen_first_shaded |= var_in(numbers_solver.grid[r][c], shading_symbols)
        require(s == int(E.top[c]))

    for (r,c) in E.clues:
        require(numbers_solver.grid[r][c] == E.clues[(r,c)])

    solutions = []
    while len(solutions) < utils.MAX_SOLUTIONS_TO_FIND and solve():
        solution = {}
        for r in range(n):
            for c in range(n):
                key = rc_to_grid(r,c)
                if numbers_solver.grid[r][c].value() in shading_symbols:
                    solution[key] = 'black'
                else:
                    solution[key] = numbers_solver.grid[r][c].value()
        solutions.append(solution)
        # Once a solution is found, add a constraint eliminating it.
        x = BoolVar(True)
        for r in range(n):
            for c in range(n):
                if numbers_solver.grid[r][c].value() in shading_symbols:
                    x = x & var_in(numbers_solver.grid[r][c], shading_symbols)
                else:
                    x = x & (numbers_solver.grid[r][c] == numbers_solver.grid[r][c].value())
        require(~x)
    
    return solutions
    
def decode(solutions):
    return utils.decode(solutions)
