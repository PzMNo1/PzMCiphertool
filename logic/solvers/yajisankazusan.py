from .claspy import *
from . import utils
from .utils.encoding import *

def encode(string):
    return utils.encode(string, clue_encoder = lambda s : s)

def solve(E):
    # Restrict the number of bits used for IntVar.
    # The highest number that we need is the highest clue number.

    grid = [[BoolVar() for c in range(E.C)] for r in range(E.R)]
    atoms = [[Atom() for c in range(E.C)] for r in range(E.R)]
    free_prove = [[BoolVar() for c in range(E.C)] for r in range(E.R)]

    # no two adjacent cells are shaded
    for r in range(E.R):
        for c in range(E.C):
            if r < E.R-1:
                require(~(grid[r][c] & grid[r+1][c]))
            if c < E.C-1:
                require(~(grid[r][c] & grid[r][c+1]))

    # connectivity:
    # (i) at most one cell is free-proved
    require(at_most(1, sum((row for row in free_prove), [])))
    # (ii) proving structure
    for r in range(E.R):
        for c in range(E.C):
            atoms[r][c].prove_if(free_prove[r][c])
            for (i,j) in [(1,0),(-1,0),(0,1),(0,-1)]:
                if 0<=r+i<E.R and 0<=c+j<E.C:
                    atoms[r][c].prove_if((~grid[r+i][c+j]) & atoms[r+i][c+j])
            require(atoms[r][c] | grid[r][c]) # everything is proved or shaded

    # clues are correct (or shaded over)
    for (r,c) in E.clues:
        num_string = E.clues[(r,c)][0]
        direction = E.clues[(r,c)][1]
        # check the clue for validity
        if not num_string.isnumeric() or direction not in 'lrud':
            raise ValueError('Please ensure that each clue has both a number and a direction.')
        
        # build a list of coordinates that are "seen" by this clue
        seen_cells = []
        if direction == 'l':
            seen_cells = [(r,y) for y in range(0, c)]
        elif direction == 'r':
            seen_cells = [(r,y) for y in range(c+1, E.C)]
        elif direction == 'u':
            seen_cells = [(x,c) for x in range(0, r)]
        elif direction == 'd':
            seen_cells = [(x,c) for x in range(r+1, E.R)]
        # get a list of boolean variables that tell you whether the cells are shaded
        require(
            sum_bools(int(num_string), [grid[x][y] for (x,y) in seen_cells]) | grid[r][c]
        )

    sols = []
    while len(sols) < MAX_SOLUTIONS_TO_FIND and claspy_solve():
        # append found solution
        sol = {}
        for r in range(E.R):
            for c in range(E.C):
                sol[rc_to_grid(r,c)] = 'darkgray' if grid[r][c].value() else ''
        sols.append(sol)

        # prevent duplicate solution before re-solving
        x = BoolVar(True)
        for r in range(E.R):
            for c in range(E.C):
                x &= (grid[r][c] == grid[r][c].value())
        require(~x)

    return sols
    
def decode(solutions):
    return utils.decode(solutions)
