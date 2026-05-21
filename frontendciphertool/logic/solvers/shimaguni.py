from .claspy import *
from . import utils
from .utils import borders
from .utils.borders import Direction
from .utils.shading import *
from .utils.grids import *

def encode(string):
    return utils.encode(string, has_borders = True)

def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)
    # Map clue numbers to their rooms.
    clue_coord_to_room = {}
    for clue in E.clues:
        for room in rooms:
            for cell in room:
                if clue == cell:
                    clue_coord_to_room[clue] = room
                    break

    max_val = max(max([len(room) for room in rooms]), max(E.clues.values(), default = 0))
    set_max_val(max_val)
    s = RectangularGridShadingSolver(E.R, E.C)
    conn = [[Atom() for c in range(E.C)] for r in range(E.R)]
    chosen = [[BoolVar() for c in range(E.C)] for r in range(E.R)]
    num_shaded_in_region = [[IntVar(1, max_val) for c in range(E.C)] for r in range(E.R)]

    # Shaded cells in a region must be connected.
    for room in rooms:
        for (r, c) in room:
            # Connected iff shaded.
            require(conn[r][c] == s.grid[r][c])
            # Prove the "chosen" cell for the region.
            conn[r][c].prove_if(chosen[r][c])
            # Prove via connectivity.
            for (y, x) in get_neighbors(E.R, E.C, r, c):
                if (y, x) in room:
                    conn[r][c].prove_if(conn[y][x] & s.grid[r][c])
        # Choose 1 cell per region.
        require(at_most(1, [chosen[r][c] for (r, c) in room]))

    # Clue cells indicate number of shaded cells there.
    for coord, room in clue_coord_to_room.items():
        require(sum_bools(E.clues[coord], [s.grid[r][c] for (r, c) in room]))

    # Every room has at least 1 shaded cell.
    for room in rooms:
        # Don't need to check clued cells.
        if room not in clue_coord_to_room.values():
            require(at_least(1, [s.grid[r][c] for (r, c) in room]))
        
    # Calculate # shaded in each region (needed for next step).
    for room in rooms:
        num_shaded = IntVar(0)
        for (r, c) in room:
            num_shaded += cond(s.grid[r][c], 1, 0)
        for (r, c) in room:
            require(num_shaded_in_region[r][c] == num_shaded)

    for r in range(E.R):
        for c in range(E.C):
            if r < E.R:
                if (r+1, c, Direction.TOP) in E.edges:
                    # Regions with same # black cells cannot be adjacent.
                    require(num_shaded_in_region[r][c] != num_shaded_in_region[r+1][c])
                    # Cells orthogonally adjacent across region boundaries - >= 1 unshaded.
                    require(at_most(1, [s.grid[r][c], s.grid[r+1][c]]))
            if c < E.C:
                if (r, c+1, Direction.LEFT) in E.edges:
                    # Regions with same # black cells cannot be adjacent.
                    require(num_shaded_in_region[r][c] != num_shaded_in_region[r][c+1])
                    # Cells orthogonally adjacent across region boundaries - >= 1 unshaded.
                    require(at_most(1, [s.grid[r][c], s.grid[r][c+1]]))
    
    return s.solutions(shaded_color = 'darkgray')

def decode(solutions):
    return utils.decode(solutions)