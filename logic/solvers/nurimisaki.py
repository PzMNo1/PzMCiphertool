from .claspy import *
from . import utils
from .utils.shading import *

def encode(string):
    return utils.encode(string)
    
def solve(E):
    set_max_val(E.R*E.C)

    s = RectangularGridShadingSolver(E.R, E.C)
    arbitrary_white_clue = None # Use this later
    # Steal #-seen-cells logic from Cave
    for ((r,c), value) in E.clues.items():
        arbitrary_white_clue = (r,c)
        if value == '?':
            continue
        dirs = {}
        for (u,v) in ((1,0),(-1,0),(0,1),(0,-1)):
            ray = []
            n = 1
            while 0 <= r+u*n < E.R and 0 <= c+v*n < E.C: # add all ray cells
                ray.append((r+u*n,c+v*n))
                n += 1
            num_seen_cells = IntVar(0, len(ray))
            for n in range(len(ray)+1):
                cond_n = BoolVar(True)
                for d in range(n):
                    cond_n &= (~s.grid[ray[d]])
                if n < len(ray):
                    cond_n &= s.grid[ray[n]]
                require((num_seen_cells == n) == cond_n)
            dirs[(u,v)] = num_seen_cells
        require(dirs[(1,0)]+dirs[(-1,0)]+dirs[(0,1)]+dirs[(0,-1)] == E.clues[(r,c)]-1)
    # A white cell can see in exactly 1 of the directions iff it is specially indicated
    for r in range(E.R):
        for c in range(E.C):
            if (r,c) in E.clues:
                require(sum_bools(1, [~s.grid[y][x] for (y,x) in s.grid.get_neighbors(r,c)]))
            else:
                require(at_least(2, [~s.grid[y][x] for (y,x) in s.grid.get_neighbors(r,c)])
                    | s.grid[r][c])
    # Simple rules
    s.white_clues(E.clues)
    s.white_connectivity(known_root = arbitrary_white_clue)
    s.no_black_2x2()
    s.no_white_2x2()
    return s.solutions()

def decode(solutions):
    return utils.decode(solutions)
