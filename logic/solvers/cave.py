from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string)

def solve(E):
#    max_val = max(E.clues.values(), default=E.R*E.C)
    set_max_val(E.R*E.C)
    
    shading_solver = utils.RectangularGridShadingSolver(E.R,E.C)
    shading_solver.white_connectivity()
    shading_solver.black_edge_connectivity()
    shading_solver.white_clues(E.clues)

    # GIVEN NUMBERS ARE SATISFIED
    for (r,c) in E.clues:
        if E.clues[(r,c)] == '?':
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
                    cond_n &= (~shading_solver.grid[ray[d]])
                if n < len(ray):
                    cond_n &= shading_solver.grid[ray[n]]
                require((num_seen_cells == n) == cond_n)
            dirs[(u,v)] = num_seen_cells

        # use product rule
        if E.params['Product']:
            cond_product = BoolVar(False) # unwind the product (so claspy works correctly)
            for (a,b) in utils.numbers.factor_pairs(E.clues[(r,c)]):
                cond_product |= (
                    (dirs[(1,0)]+dirs[(-1,0)] == a-1) &
                    (dirs[(0,1)]+dirs[(0,-1)] == b-1)
                )
            require(cond_product)
        else: # use normal rule
            require(dirs[(1,0)]+dirs[(-1,0)]+dirs[(0,1)]+dirs[(0,-1)] == E.clues[(r,c)]-1)
      
    return shading_solver.solutions()

def decode(solutions):
    return utils.decode(solutions)
