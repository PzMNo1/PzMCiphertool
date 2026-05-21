from .claspy import *
from . import utils
from .utils.shading import *

def encode(string):
    return utils.encode(string)

def solve(E):
    set_max_val(max(E.R, E.C))
    s = RectangularGridShadingSolver(E.R, E.C)

    K = list(E.clues.keys())
    for i, (r,c) in enumerate(K):
        for (r1,c1) in K[i+1:]:
            if E.clues[(r,c)] == E.clues[(r1,c1)] and (r == r1 or c == c1):
                require(s.grid[r][c] | s.grid[r1][c1])
    s.no_adjacent()
    s.white_connectivity()
    
    return s.solutions()


def decode(solutions):
    return utils.decode(solutions)