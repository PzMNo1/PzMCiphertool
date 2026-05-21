from .claspy import *
from . import utils
from .utils.encoding import *
from .utils.borders import *

def encode(string):
    json_obj = json.loads(string)
    json_grid = json_obj['grid']
    json_params = json_obj['param_values']
    
    rows, cols = int(json_params['r']), int(json_params['c'])
    clues = {}
        
    for i in range(2*(rows+1)):
        for j in range(2*(cols+1)):
            if f'{i},{j}' in json_grid:
                clues[(i,j)] = "*"

    return Encoding(rows, cols, clues)

def solve(E):
    num_regions = len(E.clues)
    if num_regions == 0:
        raise ValueError("No clues provided!")

    set_max_val(num_regions)

    grid = {}
    atoms = {}
    for r in range(E.R):
        for c in range(E.C):
            grid[(r,c)] = IntVar(0,num_regions-1)
            atoms[(r,c)] = Atom()

    clue_ids = {}
    for i, (R,C) in enumerate(list(E.clues.keys())):
        clue_ids[i] = (R,C)
        # label cells surrounding dot with that region number
        # (R,C goes to (R-1)/2,(C-1)/2, which we then round to integers in
        # at most 2^2 = 4 possible ways, to get the surrounding cells)
        r_near = [(R-1)//2] if R%2==1 else [(R-2)//2,R//2]
        c_near = [(C-1)//2] if C%2==1 else [(C-2)//2,C//2]
        for r in r_near:
            for c in c_near:
                if (r,c) in grid:
                    require(grid[(r,c)] == i)
                    atoms[(r,c)].prove_if(True) # connectivity root

        # enforce rotational symmetry of the region
        for r in range(E.R):
            for c in range(E.C):
                r1, c1 = (R-1)-r, (C-1)-c # reflection of r,c about dot
                if 0 <= r1 < E.R and 0 <= c1 < E.C:
                    require((grid[(r,c)] == i) == (grid[(r1,c1)] == i))
                else:
                    require(grid[(r,c)] != i)

        # enforce connectedness of the region
        for r in range(E.R):
            for c in range(E.C):
                require(atoms[(r,c)])
                for i,j in (0,1),(0,-1),(1,0),(-1,0):
                    if 0 <= r+i < E.R and 0 <= c+j < E.C:
                        atoms[(r,c)].prove_if(atoms[(r+i,c+j)] & \
                            (grid[(r,c)] == grid[(r+i,c+j)]))

    # solve
    sols = []
    while len(sols) < MAX_SOLUTIONS_TO_FIND and claspy_solve():
        # append found solution
        sol = {}
        for (r,c) in grid:
            sol[(r,c)] = grid[(r,c)].value()
        sols.append(sol)

        # prevent duplicate solution before re-solving
        x = BoolVar(True)
        for (r,c) in grid:
            x &= (grid[(r,c)] == grid[(r,c)].value())
        require(~x)

    # turn solutions into border diagrams
    border_sols = []
    for sol in sols:
        solution = {}
        for (r,c) in grid:
            for i,j in (0,1),(0,-1),(1,0),(-1,0):
                    if 0 <= r+i < E.R and 0 <= c+j < E.C:
                        if sol[(r,c)] != sol[(r+i,c+j)]:
                            solution[f'{2*r+1+i},{2*c+1+j}'] = 'black'
        border_sols.append(solution)

    return border_sols
    
def decode(solutions):
    return utils.decode(solutions)
