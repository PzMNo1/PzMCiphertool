from .claspy import *
from . import utils
from .utils.loops import *
from .utils import grids

def encode(string):
    return utils.encode(string, has_borders = True, clue_encoder = lambda x : int(x) if x.isnumeric() else x)
    
def solve(E):
    if not ('S' in E.clues.values() and 'G' in E.clues.values()):
        raise ValueError('S and G squares must be provided.')

    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)

    room_has_start = {room: False for room in rooms}
    start = None
    goal = None
    for room in rooms:
        for (r, c) in room:
            clue = E.clues.get((r,c))
            if clue == 'S':
                start = (r,c)
                room_has_start[room] = True
            elif clue == 'G':
                goal = (r,c)

    cell_to_room, room_spanners = {}, {}
    for room in rooms:
        for (r, c) in room:
            cell_to_room[(r, c)] = room
            for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c):
                if (y, x) not in room:
                    if room not in room_spanners:
                        room_spanners[room] = set()
                    room_spanners[room].add(((r, c), (y, x)))

    parent = grids.RectangularGrid(E.R, E.C, lambda r,c: MultiVar('^','v','<','>','.'))
    require(parent[start] == '.')

     # before[u][v] is true iff u comes (weakly) before v in the path
    before = {}
    for coord1 in parent.iter_coords():
        for coord2 in parent.iter_coords():
            before[(coord1,coord2)] = Atom()
            if coord1 != coord2 and (coord2,coord1) in before:
                # require antisymmetry
                require(before[(coord1, coord2)] != before[(coord2, coord1)])

    for coord1 in parent.iter_coords():
        for coord2 in parent.iter_coords():
            if coord1 == coord2:
                before[(coord1,coord2)].prove_if(True)
            else:
                cond = False
                r, c = coord2
                if r > 0:
                    cond |= ((parent[coord2] == '^') & before[(coord1,(r-1,c))])
                if r < E.R-1:
                    cond |= ((parent[coord2] == 'v') & before[(coord1,(r+1,c))])
                if c > 0:
                    cond |= ((parent[coord2] == '<') & before[(coord1,(r,c-1))])
                if c < E.C-1:
                    cond |= ((parent[coord2] == '>') & before[(coord1,(r,c+1))])
                before[(coord1,coord2)].prove_if(cond)

    for coord in parent.iter_coords():
        require(before[(start,coord)]) # everything has to come after start, i.e., be on the path
        if coord != goal:
            require(~before[(goal,coord)]) # nothing can come after goal

    for coord in E.clues:
        room = cell_to_room[coord]
        value = E.clues[coord]
        if value in ['S','G']: continue

        possible_entrances = []
        for (A,B) in room_spanners.get(room, []): # A in room; B not in room and adj to A
            # so we want ... -> B -> A -> ... -> coord
            r2,c2 = B
            if A == (r2+1,c2): # A below B
                adj_AB = (parent[A] == '^')
            if A == (r2-1,c2): # A above B
                adj_AB = (parent[A] == 'v')
            if A == (r2,c2+1): # A right of B
                adj_AB = (parent[A] == '<')
            if A == (r2,c2-1): # A left of B
                adj_AB = (parent[A] == '>')

            possible_entrances.append(before[(A,coord)] & adj_AB)

        if room_has_start[room]:
            require(sum_bools(value-1, possible_entrances))
        else:
            require(sum_bools(value, possible_entrances))



    # thanks for writing this formatting code jenna

    ALL = ['J^', 'J<', '7v', '7<', 'L^', 'L>', 'r>', 'rv', '->', '-<', '1^', '1v', 'S', 'G']

    # Paths
    conn_patterns = [[MultiVar(*ALL) for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            require((conn_patterns[r][c] == 'S') == ((r,c) == start))
            require((conn_patterns[r][c] == 'G') == ((r,c) == goal))

            # --- Top / bottom edge rules ---
            if r == 0:
                require(~var_in(conn_patterns[r][c], TOP_IN+TOP_OUT))
            if r == E.R - 1:
                require(~var_in(conn_patterns[r][c], BOTTOM_IN+BOTTOM_OUT))
            # --- Left / right edge rules ---
            if c == 0:
                require(~var_in(conn_patterns[r][c], LEFT_IN+LEFT_OUT))
            if c == E.C - 1:
                require(~var_in(conn_patterns[r][c], RIGHT_IN+RIGHT_OUT))
            # # --- Other connectivity rules ---
            if 0 < r:
                # Cover cases where this cell has flow in from the top.
                # Cases where top cell has flow in from the bottom will be covered in the r < E.R - 1 section.
                
                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], TOP_IN+['G']) |
                    ~var_in(conn_patterns[r-1][c], BOTTOM_OUT)
                )
                # Parent tracking & connectivity
                flow_from_top = (var_in(conn_patterns[r-1][c], BOTTOM_OUT) |
                    ((conn_patterns[r-1][c] == 'S') & var_in(conn_patterns[r][c], TOP_IN)))
                require(flow_from_top == (parent[r][c] == '^'))

            if r < E.R - 1:
                # Cases where this cell has flow in from the bottom.

                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], BOTTOM_IN+['G']) |
                    ~var_in(conn_patterns[r+1][c], TOP_OUT)
                )
                # Parent tracking
                flow_from_bottom = (var_in(conn_patterns[r+1][c], TOP_OUT) |
                    ((conn_patterns[r+1][c] == 'S') & var_in(conn_patterns[r][c], BOTTOM_IN)))
                require(flow_from_bottom == (parent[r][c] == 'v'))

            if 0 < c:
                # Cases where this cell has flow in from the left.

                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], LEFT_IN+['G']) |
                    ~var_in(conn_patterns[r][c-1], RIGHT_OUT)
                )
                # Parent tracking
                flow_from_left = (var_in(conn_patterns[r][c-1], RIGHT_OUT) |
                    ((conn_patterns[r][c-1] == 'S') & var_in(conn_patterns[r][c], LEFT_IN)))
                require(flow_from_left == (parent[r][c] == '<'))
                
            if c < E.C - 1:
                # Cases where this cell has flow in from the right.

                # Basic rules (no dangling edges)
                require(var_in(conn_patterns[r][c], RIGHT_IN+['G']) |
                    ~var_in(conn_patterns[r][c+1], LEFT_OUT)
                )
                # Parent tracking
                flow_from_right = (var_in(conn_patterns[r][c+1], LEFT_OUT) |
                    ((conn_patterns[r][c+1] == 'S') & var_in(conn_patterns[r][c], RIGHT_IN)))
                require(flow_from_right == (parent[r][c] == '>'))

    def format_function(r, c):
        if (r,c) == start or (r,c) == goal:
            return ''
        return f'{DIRECTIONAL_PAIR_TO_UNICODE[conn_patterns[r][c].value()]}.png'

    res = utils.solutions.get_all_grid_solutions(conn_patterns, format_function=format_function)
    return res

def decode(solutions):
    return utils.decode(solutions)