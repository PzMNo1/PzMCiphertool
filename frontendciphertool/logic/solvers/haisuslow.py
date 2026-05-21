from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_borders = True, clue_encoder = lambda x : int(x) if x.isnumeric() else x)
    
def solve(E):
    if not ('s' in E.clues.values() and 'g' in E.clues.values()):
        raise ValueError('S and G squares must be provided.')

    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)
    cell_to_room, room_spanners = {}, {}
    for room in rooms:
        for (r, c) in room:
            cell_to_room[(r,c)] = room
            for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c):
                if (y, x) not in room:
                    if room not in room_spanners:
                        room_spanners[room] = set()
                    room_spanners[room].add(((r, c), (y, x)))
    # Counts the place on the path, from 0 to E.R*E.C-1 (inclusive).
    grid = [[IntVar(0, E.R*E.C-1) for c in range(E.C)] for r in range(E.R)]
    require_all_diff([grid[r][c] for c in range(E.C) for r in range(E.R)])

    r_start, c_start = None, None
    for r in range(E.R):
        for c in range(E.C):
            if E.clues.get((r,c)) == 's':
                r_start = r
                c_start = c
                room_start = cell_to_room[(r,c)]
                require(grid[r][c] == 0)

            if E.clues.get((r,c)) == 'g':
                require(grid[r][c] == E.R*E.C-1)
            else:
                cond = False
                for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c):
                    cond |= (grid[y][x] == (grid[r][c] + 1))
                require(cond)

    for (r, c), value in E.clues.items():
        if type(value) == int:
            visit_count = IntVar(0)
            for ((y, x), (y2, x2)) in room_spanners[cell_to_room[(r, c)]]:
                visit_count += (grid[y][x] == grid[y2][x2] + 1) & (grid[y][x] <= grid[r][c])
            
            if cell_to_room[(r,c)] == room_start:
                require(visit_count + 1 == value)
            else:
                require(visit_count == value)
    
    def format_function(r, c):
        if E.clues.get((r,c)) == 's':
            if 0 < r and grid[r][c].value() == grid[r-1][c].value() - 1:
                return 's↑.png'
            if r < E.R-1 and grid[r][c].value() == grid[r+1][c].value() - 1:
                return 's↓.png'
            if 0 < c and grid[r][c].value() == grid[r][c-1].value() - 1:
                return 's←.png'
            if c < E.C-1 and grid[r][c].value() == grid[r][c+1].value() - 1:
                return 's→.png'
        
        elif E.clues.get((r,c)) == 'g':
            if 0 < r and grid[r][c].value() == grid[r-1][c].value() + 1:
                return 'g↓.png'
            if r < E.R-1 and grid[r][c].value() == grid[r+1][c].value() + 1:
                return 'g↑.png'
            if 0 < c and grid[r][c].value() == grid[r][c-1].value() + 1:
                return 'g→.png'
            if c < E.C-1 and grid[r][c].value() == grid[r][c+1].value() + 1:
                return 'g←.png'

        if 0 < r:
            flow_up_out = grid[r][c].value() == grid[r-1][c].value() - 1
            flow_down_in = grid[r][c].value() == grid[r-1][c].value() + 1
            if 0 < c:
                flow_left_out = grid[r][c].value() == grid[r][c-1].value() - 1
                flow_right_in = grid[r][c].value() == grid[r][c-1].value() + 1
                if flow_right_in and flow_up_out:
                    return '⬏.png'
                elif flow_down_in and flow_left_out:
                    return '↲.png'
            if c < E.C-1:
                flow_right_out = grid[r][c].value() == grid[r][c+1].value() - 1
                flow_left_in = grid[r][c].value() == grid[r][c+1].value() + 1
                if flow_left_in and flow_up_out:
                    return '⬑.png'
                elif flow_down_in and flow_right_out:
                    return'↳.png'
        if r < E.R-1:
            flow_down_out = grid[r][c].value() == grid[r+1][c].value() - 1
            flow_up_in = grid[r][c].value() == grid[r+1][c].value() + 1
            if 0 < c:
                flow_left_out = grid[r][c].value() == grid[r][c-1].value() - 1
                flow_right_in = grid[r][c].value() == grid[r][c-1].value() + 1
                if flow_right_in and flow_down_out:
                    return '↴.png'
                elif flow_up_in and flow_left_out:
                    return '↰.png'
            if c < E.C-1:
                flow_right_out = grid[r][c].value() == grid[r][c+1].value() - 1
                flow_left_in = grid[r][c].value() == grid[r][c+1].value() + 1
                if flow_left_in and flow_down_out:
                    return '⬐.png'
                elif flow_up_in and flow_right_out:
                    return '↱.png'
        if 0 < r < E.R-1:
            flow_up_out = grid[r][c].value() == grid[r-1][c].value() - 1
            flow_down_in = grid[r][c].value() == grid[r-1][c].value() + 1
            flow_down_out = grid[r][c].value() == grid[r+1][c].value() - 1
            flow_up_in = grid[r][c].value() == grid[r+1][c].value() + 1
            if flow_down_in and flow_down_out:
                return '↓.png'
            elif flow_up_in and flow_up_out:
                return '↑.png'
        if 0 < c < E.C-1:
            flow_left_out = grid[r][c].value() == grid[r][c-1].value() - 1
            flow_right_in = grid[r][c].value() == grid[r][c-1].value() + 1
            flow_right_out = grid[r][c].value() == grid[r][c+1].value() - 1
            flow_left_in = grid[r][c].value() == grid[r][c+1].value() + 1
            if flow_right_in and flow_right_out:
                return '→.png'
            if flow_left_in and flow_left_out:
                return '←.png'

    return utils.solutions.get_all_grid_solutions(grid, format_function=format_function)

def decode(solutions):
    return utils.decode(solutions)