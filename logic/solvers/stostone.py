from .claspy import *
from . import utils
from .utils.shading import *
from .utils.regions import *

def encode(string):
    return utils.encode(string, has_borders=True)

def solve(E):
    if E.R % 2 != 0:
        raise ValueError('The stostone grid must have an even # rows.')

    max_stone_id = E.R//2
    set_max_val(max_stone_id)

    rooms = full_bfs(E.R, E.C, E.edges)
    rc_to_room, room_to_clue = {}, {}
    for room in rooms:
        for (r, c) in room:
            rc_to_room[(r,c)] = room
            if (r, c) in E.clues:
                room_to_clue[room] = int(E.clues[(r,c)])
                
    s = RectangularGridShadingSolver(E.R, E.C)
    # Count number of black cells at a certain position and below in the same column.
    grid = [[IntVar(0, max_stone_id) for c in range(E.C)] for r in range(E.R)]

    # Black cells within a room must be connected.
    for room in rooms:
        chosen = {(r,c): BoolVar() for (r,c) in room}
        conns = [[Atom() for c in range(E.C)] for r in range(E.R)]
        for (r, c) in room:
            for (y, x) in get_neighbors(E.R, E.C, r, c):
                conns[r][c].prove_if((s.grid[y][x] & conns[y][x]) | chosen[(r,c)])
            require(conns[r][c] | ~s.grid[r][c])
        require(sum_bools(1, chosen.values()))
    
    # Cell with a number indicates number of black cells in region.
    # Or, if no number is present, >= 1 must be black.
    for room in rooms:
        if room in room_to_clue:
            require(sum_bools(room_to_clue[room], [s.grid[r][c] for (r, c) in room]))
        else:
            require(at_least(1, [s.grid[r][c] for (r, c) in room]))

    # When 2 cells are adjacent across region boundaries, at most 1 can be black.
    for r in range(E.R):
        for c in range(E.C):
            if r < E.R-1 and rc_to_room[(r,c)] != rc_to_room[(r+1,c)]:
                require(at_most(1, [s.grid[r][c], s.grid[r+1][c]]))
            if c < E.C-1 and rc_to_room[(r,c)] != rc_to_room[(r,c+1)]:
                require(at_most(1, [s.grid[r][c], s.grid[r][c+1]]))

    # Each column must have numbers 1 through max_stone_id.
    for c in range(E.C):
        require(grid[E.R-1][c] == cond(s.grid[E.R-1][c], 1, 0))
        for r in range(E.R-2, -1, -1):
            require(grid[r][c] == (grid[r+1][c] + cond(s.grid[r][c], 1, 0)))
        require(grid[0][c] == max_stone_id)

    # Connected stones in different columns must fall together.
    for r in range(E.R):
        for c in range(E.C-1):
            require((grid[r][c] == grid[r][c+1]) | ~(s.grid[r][c] & s.grid[r][c+1]))

    return s.solutions(shaded_color='darkgray')

def decode(solutions):
    return utils.decode(solutions)
