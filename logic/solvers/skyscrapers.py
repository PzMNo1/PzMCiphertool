from .claspy import *
from . import utils
from .utils import encoding

def encode(string):
    return utils.encode(string, outside_clues = '1111')

def solve(E):
    if E.R != E.C:
        raise ValueError('Skyscrapers puzzles must be square :(')
    n = E.R

    set_max_val(n)
    
    numbers_solver = utils.RectangularGridNumbersSolver(n, n, 1, n)
    numbers_solver.rows_and_cols()
    grid = numbers_solver.grid

    # given numbers
    for (i,j) in E.clues:
        if E.clues[(i,j)] == '?':
            continue
        require(grid[i][j] == E.clues[(i,j)])

    # top clues
    top_visible = [[BoolVar(True) for c in range(n)] for r in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(i):
                top_visible[i][j] &= (grid[i][j] > grid[k][j])
    for j in E.top:
        if E.top[j] == '?':
            continue
        require(sum_vars([top_visible[i][j] for i in range(n)]) == E.top[j])

    # right clues
    right_visible = [[BoolVar(True) for c in range(n)] for r in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(j+1, n):
                right_visible[i][j] &= (grid[i][j] > grid[i][k])
    for i in E.right:
        if E.right[i] == '?':
            continue
        require(sum_vars([right_visible[i][j] for j in range(n)]) == E.right[i])

    # bottom clues
    bottom_visible = [[BoolVar(True) for c in range(n)] for r in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(i+1,n):
                bottom_visible[i][j] &= (grid[i][j] > grid[k][j])
    for j in E.bottom:
        if E.bottom[j] == '?':
            continue
        require(sum_vars([bottom_visible[i][j] for i in range(n)]) == E.bottom[j])

    # left clues
    left_visible = [[BoolVar(True) for c in range(n)] for r in range(n)]
    for i in range(n):
        for j in range(n):
            for k in range(j):
                left_visible[i][j] &= (grid[i][j] > grid[i][k])
    for i in E.left:
        if E.left[i] == '?':
            continue
        require(sum_vars([left_visible[i][j] for j in range(n)]) == E.left[i])

    return numbers_solver.solutions()
        
def decode(solutions):
    return utils.decode(solutions)
