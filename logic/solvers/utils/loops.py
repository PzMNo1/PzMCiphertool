from ..claspy import *
from .grids import *
from .solutions import *
from .encoding import *

# --- ISOLATED CELL PATTERNS ---
ISOLATED = ['.', '']
LEFT_CONNECTING = ['J', '7', '-']
RIGHT_CONNECTING = ['L', 'r', '-']
UP_CONNECTING = ['J', 'L', '1']
DOWN_CONNECTING = ['7', 'r', '1']
NON_DIRECTED_BENDS = ['J', '7', 'L', 'r']
NON_DIRECTED_STRAIGHTS = ['-', '1']
NON_DIRECTED = ['J', '7', 'L', 'r', '-', '1', '']
LEFT_IN = ['J^', '7v', '->']
RIGHT_IN = ['L^', 'rv', '-<']
TOP_IN = ['J<', 'L>', '1v']
BOTTOM_IN = ['7<', 'r>', '1^']
LEFT_OUT = ['J<', '7<', '-<']
RIGHT_OUT = ['L>', 'r>', '->']
TOP_OUT = ['J^', 'L^', '1^']
BOTTOM_OUT = ['7v', 'rv', '1v']
DIRECTED = ['J^', 'J<', '7v', '7<', 'L^', 'L>', 'r>', 'rv', '->', '-<', '1^', '1v', '']
DIRECTED_BENDS = ['J^', 'J<', '7v', '7<', 'L^', 'L>', 'r>', 'rv']
DIRECTED_STRAIGHTS = ['->', '-<', '1^', '1v', '']

DIRECTIONAL_PAIR_TO_UNICODE = {
    'J^': '⬏',
    'J<': '↲',
    '7v': '↴',
    '7<': '↰',
    'L^': '⬑',
    'L>': '↳',
    'r>': '↱',
    'rv': '⬐',
    '->': '→',
    '-<': '←',
    '1^': '↑',
    '1v': '↓',
}

class RectangularGridLoopSolver:
    '''
    Solves puzzles which involve drawing loops through cells.
    
    Is always a "main" solver (is never "auxiliary").
    '''
    def __init__(self,
            rows,
            cols,
            directed = False,
            shading = False,
            min_num_loops = 1,
            max_num_loops = 1):
        '''
        rows = # rows of the puzzle
        cols = # columns of the puzzle
        directed = True iff the loop has a direction
        shading = True iff this puzzle also involves shading
        min_num_loops = minimum number of permissible loops
        max_num_loops = maximum number of permissible loops
        '''
        self.__rows = rows
        self.__cols = cols
        
        if directed:
            symbol_set = DIRECTED[:]
        else:
            symbol_set = NON_DIRECTED[:]
        if shading:
            symbol_set.append('.')
        self.__grid = RectangularGrid(rows, cols, lambda : MultiVar(*symbol_set))
        
        # build a graph of the the loop-connected nodes
        self.__loop_graph = [[Atom() for c in range(cols)] for r in range(rows)]
        
        # keep track of whether each node is the starting point of some loop
        self.__loop_start = [[BoolVar() for c in range(cols)] for r in range(rows)]
        
        self.__directed = directed
        
        self.min_num_loops = min_num_loops
        self.max_num_loops = max_num_loops
        if max_num_loops > 1:
            self.__loop_id = [[IntVar(0, max_num_loops) for c in range(self.cols)] for r in range(self.rows)]
        
    @property
    def rows(self):
        return self.__rows
    @property
    def cols(self):
        return self.__cols
    @property
    def grid(self):
        return self.__grid
    @property
    def loop_id(self):
        return self.__loop_id
    def loop(self,
             clue_cells,
             includes_clues = False,
             allow_blanks = True,
             transparent = False):
        '''
        clue_cells = a dictionary mapping (r, c) to clue values
        includes_clues = True iff the loop can go through clues
        allow_blanks = True iff cells can be empty (non-clue, non-shaded, non-loop)
        transparent = True iff clue cells can be shaded
        '''
        for r in range(self.rows):
            for c in range(self.cols):
                if not includes_clues:
                    if transparent:
                        if (r, c) in clue_cells:
                            require(var_in(self.grid[r][c], ISOLATED))
                    else:
                        if (r, c) in clue_cells:
                            require(self.grid[r][c] == '')
                    if not allow_blanks:
                        require((self.grid[r][c] == '') == ((r, c) in clue_cells))
                else:
                    if not allow_blanks:
                        require(self.grid[r][c] != '')
                # if a cell is not part of a loop, give it a "loop ID" of the maximum number of loops
                # (1 more than highest real loop ID)
                if self.max_num_loops > 1:
                    require((self.__loop_id[r][c] == self.max_num_loops) == (var_in(self.grid[r][c], ISOLATED)))
                        
                # not leftmost
                if 0 <= c-1:
                    # if not leftmost and not topmost
                    if 0 <= r-1:
                        if not self.__directed:
                            # a cell looks like J iff:
                            #  - its left neighbor has a rightward-connecting edge,
                            #  - its top neighbor has a downward-connecting edge
                            require((var_in(self.grid[r][c-1], RIGHT_CONNECTING) &
                                         var_in(self.grid[r-1][c], DOWN_CONNECTING)) ==
                                    (self.grid[r][c] == 'J'))
                            # cell is connected to loop if it's a "loop start" or
                            # if (its left or top neighbors are part of the loop)
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'J') &
                                    (self.__loop_graph[r][c-1] | self.__loop_graph[r-1][c])))
                            # cell has the same loop ID as the cells it's connected to
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c-1]) &
                                    (self.__loop_id[r][c] == self.__loop_id[r-1][c])) |
                                    (self.grid[r][c] != 'J')
                                )
                        else:
                            # a cell looks like a directed J, pointing left, iff:
                            #  - its left neighbor has flow in from the right
                            #  - its top neighbor has flow down
                            require((var_in(self.grid[r][c-1], RIGHT_IN) &
                                     var_in(self.grid[r-1][c], BOTTOM_OUT)) ==
                                    (self.grid[r][c] == 'J<'))
                            # a cell looks like a directed J, pointing up, iff:
                            #  - its left neighbor has flow right
                            #  - its top neighbor has flow in from the bottom
                            require((var_in(self.grid[r][c-1], RIGHT_OUT) &
                                     var_in(self.grid[r-1][c], BOTTOM_IN)) ==
                                    (self.grid[r][c] == 'J^'))
                            # cell is connected to loop if it's a "loop start" or
                            # if its in neighbor is part of the loop
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'J<') & (self.__loop_graph[r-1][c])))
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'J^') & (self.__loop_graph[r][c-1])))
                            # cell has the same loop ID as its parent cell
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r-1][c]) | (self.grid[r][c] != 'J<')) |
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c-1]) | (self.grid[r][c] != 'J^'))
                                )

                    # if not leftmost and not bottommost
                    if r+1 < self.rows:
                        if not self.__directed:
                            # a cell looks like 7 iff:
                            #  - its left neighbor has a rightward-connecting edge,
                            #  - its bottom neighbor has an upward-connecting edge
                            require((var_in(self.grid[r][c-1], RIGHT_CONNECTING) &
                                         var_in(self.grid[r+1][c], UP_CONNECTING)) ==
                                    (self.grid[r][c] == '7'))
                            # cell is connected to loop if it's a "loop start" or
                            # if (its left or bottom neighbors are part of the loop)
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == '7') &
                                    (self.__loop_graph[r][c-1] | self.__loop_graph[r+1][c])))
                            # cell has the same loop ID as the cells it's connected to
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c-1]) &
                                    (self.__loop_id[r][c] == self.__loop_id[r+1][c])) |
                                    (self.grid[r][c] != '7')
                                )
                        else:
                            # a cell looks like a directed 7, pointing left, iff:
                            #  - its left neighbor has flow in from the right
                            #  - its bottom neighbor has flow up
                            require((var_in(self.grid[r][c-1], RIGHT_IN) &
                                     var_in(self.grid[r+1][c], TOP_OUT)) ==
                                    (self.grid[r][c] == '7<'))
                            # a cell looks like a directed 7, pointing down, iff:
                            #  - its left neighbor has flow right
                            #  - its bottom neighbor has flow in from the top
                            require((var_in(self.grid[r][c-1], RIGHT_OUT) &
                                     var_in(self.grid[r+1][c], TOP_IN)) ==
                                    (self.grid[r][c] == '7v'))
                            # cell is connected to loop if it's a "loop start" or
                            # if its in neighbor is part of the loop
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == '7<') & (self.__loop_graph[r+1][c])))
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == '7v') & (self.__loop_graph[r][c-1])))
                            # cell has the same loop ID as its parent cell
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r+1][c]) | (self.grid[r][c] != '7<')) |
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c-1]) | (self.grid[r][c] != '7v'))
                                )
                    # if not leftmost and not rightmost
                    if c+1 < self.cols:
                        if not self.__directed:
                            # a cell looks like - iff:
                            #  - its left neighbor has a rightward-connecting edge,
                            #  - its bottom neighbor has a leftward-connecting edge
                            require((var_in(self.grid[r][c-1], RIGHT_CONNECTING) &
                                         var_in(self.grid[r][c+1], LEFT_CONNECTING)) ==
                                    (self.grid[r][c] == '-'))
                            # cell is connected to loop if it's a "loop start" or
                            # if (its left or right neighbors are part of the loop)
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == '-') &
                                    (self.__loop_graph[r][c-1] | self.__loop_graph[r][c+1])))
                            # cell has the same loop ID as the cells it's connected to
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c-1]) &
                                    (self.__loop_id[r][c] == self.__loop_id[r][c+1])) |
                                    (self.grid[r][c] != '-')
                                )
                        else:
                            # a cell looks like a directed -, pointing left, iff:
                            #  - its left neighbor has flow in from the right
                            #  - its right neighbor has flow left
                            require((var_in(self.grid[r][c-1], RIGHT_IN) &
                                     var_in(self.grid[r][c+1], LEFT_OUT)) ==
                                    (self.grid[r][c] == '-<'))
                            # a cell looks like a directed -, pointing right, iff:
                            #  - its left neighbor has flow right
                            #  - its right neighbor has flow in the left
                            require((var_in(self.grid[r][c-1], RIGHT_OUT) &
                                     var_in(self.grid[r][c+1], LEFT_IN)) ==
                                    (self.grid[r][c] == '->'))
                            # cell is connected to loop if it's a "loop start" or
                            # if its in neighbor is part of the loop
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == '-<') & (self.__loop_graph[r][c+1])))
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == '->') & (self.__loop_graph[r][c-1])))
                            # cell has the same loop ID as its parent cell
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c+1]) | (self.grid[r][c] != '-<')) |
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c-1]) | (self.grid[r][c] != '->'))
                                )
                # not rightmost
                if c+1 < self.cols:
                    # if not rightmost and not topmost
                    if 0 <= r-1:
                        if not self.__directed:
                            # a cell looks like L iff:
                            #  - its right neighbor has a leftward-connecting edge,
                            #  - its top neighbor has a downward-connecting edge
                            require((var_in(self.grid[r][c+1], LEFT_CONNECTING) &
                                         var_in(self.grid[r-1][c], DOWN_CONNECTING)) ==
                                    (self.grid[r][c] == 'L'))
                            # cell is connected to loop if it's a "loop start" or
                            # if (its right or top neighbors are part of the loop)
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'L') &
                                    (self.__loop_graph[r][c+1] | self.__loop_graph[r-1][c])))
                            # cell has the same loop ID as the cells it's connected to
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c+1]) &
                                    (self.__loop_id[r][c] == self.__loop_id[r-1][c])) |
                                    (self.grid[r][c] != 'L')
                                )
                        else:
                            # a cell looks like a directed L, pointing up, iff:
                            #  - its top neighbor has flow in from the bottom
                            #  - its right neighbor has flow left
                            require((var_in(self.grid[r-1][c], BOTTOM_IN) &
                                     var_in(self.grid[r][c+1], LEFT_OUT)) ==
                                    (self.grid[r][c] == 'L^'))
                            # a cell looks like a directed L, pointing right, iff:
                            #  - its top neighbor has flow down
                            #  - its right neighbor has flow in from the left
                            require((var_in(self.grid[r-1][c], BOTTOM_OUT) &
                                     var_in(self.grid[r][c+1], LEFT_IN)) ==
                                    (self.grid[r][c] == 'L>'))
                            # cell is connected to loop if it's a "loop start" or
                            # if its in neighbor is part of the loop
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'L^') & (self.__loop_graph[r][c+1])))
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'L>') & (self.__loop_graph[r-1][c])))
                            # cell has the same loop ID as its parent cell
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c+1]) | (self.grid[r][c] != 'L^')) |
                                    ((self.__loop_id[r][c] == self.__loop_id[r-1][c]) | (self.grid[r][c] != 'L>'))
                                )
                                
                    # if not rightmost and not bottommost
                    if r+1 < self.rows:
                        if not self.__directed:
                            # a cell looks like r iff:
                            #  - its right neighbor has a leftward-connecting edge,
                            #  - its bottom neighbor has a upward-connecting edge
                            require((var_in(self.grid[r][c+1], LEFT_CONNECTING) &
                                         var_in(self.grid[r+1][c], UP_CONNECTING)) ==
                                    (self.grid[r][c] == 'r'))
                            # cell is connected to loop if it's a "loop start" or
                            # if (its right or bottom neighbors are part of the loop)
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'r') &
                                    (self.__loop_graph[r][c+1] | self.__loop_graph[r+1][c])))
                            # cell has the same loop ID as the cells it's connected to
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c+1]) &
                                    (self.__loop_id[r][c] == self.__loop_id[r+1][c])) |
                                    (self.grid[r][c] != 'r')
                                )
                        else:
                            # a cell looks like a directed r, pointing right, iff:
                            #  - its right neighbor has flow in from the left
                            #  - its bottom neighbor has flow up
                            require((var_in(self.grid[r][c+1], LEFT_IN) &
                                     var_in(self.grid[r+1][c], TOP_OUT)) ==
                                    (self.grid[r][c] == 'r>'))
                            # a cell looks like a directed r, pointing down, iff:
                            #  - its right neighbor has flow left
                            #  - its bottom neighbor has flow in from the top
                            require((var_in(self.grid[r][c+1], LEFT_OUT) &
                                     var_in(self.grid[r+1][c], TOP_IN)) ==
                                    (self.grid[r][c] == 'rv'))
                            # cell is connected to loop if it's a "loop start" or
                            # if its in neighbor is part of the loop
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'r>') & (self.__loop_graph[r+1][c])))
                            self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                                ((self.grid[r][c] == 'rv') & (self.__loop_graph[r][c+1])))
                            # cell has the same loop ID as its parent cell
                            if self.max_num_loops > 1:
                                require(
                                    ((self.__loop_id[r][c] == self.__loop_id[r+1][c]) | (self.grid[r][c] != 'r>')) |
                                    ((self.__loop_id[r][c] == self.__loop_id[r][c+1]) | (self.grid[r][c] != 'rv'))
                                )

                # not topmost or bottommost
                if 0 < r and r+1 < self.rows:
                    if not self.__directed:
                        require((var_in(self.grid[r-1][c], DOWN_CONNECTING) &
                                     var_in(self.grid[r+1][c], UP_CONNECTING)) ==
                                (self.grid[r][c] == '1'))
                        # cell is connected to loop if it's a "loop start" or
                        # if (its top or bottom neighbors are part of the loop)
                        self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                            ((self.grid[r][c] == '1') &
                                (self.__loop_graph[r-1][c] | self.__loop_graph[r+1][c])))
                        # cell has the same loop ID as the cells it's connected to
                        if self.max_num_loops > 1:
                            require(
                                ((self.__loop_id[r][c] == self.__loop_id[r-1][c]) &
                                (self.__loop_id[r][c] == self.__loop_id[r+1][c])) |
                                (self.grid[r][c] != '1')
                            )
                    else:
                        # a cell looks like a directed 1, pointing up, iff:
                        #  - its top neighbor has flow in from the bottom
                        #  - its bottom neighbor has flow up
                        require((var_in(self.grid[r-1][c], BOTTOM_IN) &
                                 var_in(self.grid[r+1][c], TOP_OUT)) ==
                                (self.grid[r][c] == '1^'))
                        # a cell looks like a directed 1, pointing down, iff:
                        #  - its top neighbor has flow down
                        #  - its bottom neighbor has flow in from the top
                        require((var_in(self.grid[r-1][c], BOTTOM_OUT) &
                                 var_in(self.grid[r+1][c], TOP_IN)) ==
                                (self.grid[r][c] == '1v'))
                        # cell is connected to loop if it's a "loop start" or
                        # if its in neighbor is part of the loop
                        self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                            ((self.grid[r][c] == '1^') & (self.__loop_graph[r+1][c])))
                        self.__loop_graph[r][c].prove_if(self.__loop_start[r][c] |
                            ((self.grid[r][c] == '1v') & (self.__loop_graph[r-1][c])))
                        # cell has the same loop ID as its parent cell
                        if self.max_num_loops > 1:
                            require(
                                ((self.__loop_id[r][c] == self.__loop_id[r+1][c]) | (self.grid[r][c] != '1^')) |
                                ((self.__loop_id[r][c] == self.__loop_id[r-1][c]) | (self.grid[r][c] != '1v'))
                            )
                            
                # if the cell is on one of the borders
                if r == 0:
                    if not self.__directed:
                        require(~var_in(self.grid[r][c], UP_CONNECTING))
                    else:
                        require(~var_in(self.grid[r][c], TOP_IN + TOP_OUT))
                if r == self.rows-1:
                    if not self.__directed:
                        require(~var_in(self.grid[r][c], DOWN_CONNECTING))
                    else:
                        require(~var_in(self.grid[r][c], BOTTOM_IN + BOTTOM_OUT))
                if c == 0:
                    if not self.__directed:
                        require(~var_in(self.grid[r][c], LEFT_CONNECTING))
                    else:
                        require(~var_in(self.grid[r][c], LEFT_IN + LEFT_OUT))
                if c == self.cols-1:
                    if not self.__directed:
                        require(~var_in(self.grid[r][c], RIGHT_CONNECTING))
                    else:
                        require(~var_in(self.grid[r][c], RIGHT_IN + RIGHT_OUT))
                # all non-clue, non-shaded cells are part of a loop
                require(self.__loop_graph[r][c] | (var_in(self.grid[r][c], ISOLATED)))
                
        # constrain number of loops; a cell can only be a true loop start if it's non-isolated
        is_loop_start = [(self.__loop_start[r][c] & ~var_in(self.grid[r][c], ISOLATED)) for c in range(self.cols) for r in range(self.rows)]
        require(at_least(self.min_num_loops, is_loop_start))
        require(at_most(self.max_num_loops, is_loop_start))
        
    def no_reentrance(self, regions):
        '''
        Given a set of regions (where each region is composed of (r, c) coordinate tuples),
        requires no loop enters a region more than once.
        '''
        if self.max_num_loops > 1:
            for region in regions:
                for loop_id in range(self.max_num_loops):
                    # keep track of the number of connections that this cell has to the outside
                    num_outside_connections = IntVar(0)
                    for (r, c) in region:
                        # if top neighbor is not in the region (or does not exist)
                        if (r-1, c) not in region:
                            num_outside_connections += cond(var_in(self.grid[r][c], UP_CONNECTING + TOP_IN + TOP_OUT) & (self.__loop_id[r][c] == loop_id), 1, 0)
                        # bottom neighbor
                        if (r+1, c) not in region:
                            num_outside_connections += cond(var_in(self.grid[r][c], DOWN_CONNECTING + BOTTOM_IN + BOTTOM_OUT) & (self.__loop_id[r][c] == loop_id), 1, 0)
                        # left neighbor
                        if (r, c-1) not in region:
                            num_outside_connections += cond(var_in(self.grid[r][c], LEFT_CONNECTING + LEFT_IN + LEFT_OUT) & (self.__loop_id[r][c] == loop_id), 1, 0)
                        # right neighbor
                        if (r, c+1) not in region:
                            num_outside_connections += cond(var_in(self.grid[r][c], RIGHT_CONNECTING + RIGHT_IN + RIGHT_OUT) & (self.__loop_id[r][c] == loop_id), 1, 0)
                    # we should have either 0 outside connections (loop doesn't hit this region) or 2 outside connections (in/out)
                    require(num_outside_connections < 3)
        else:
            for region in regions:
                # keep track of the number of connections that this cell has to the outside
                num_outside_connections = IntVar(0)
                for (r, c) in region:
                    # if top neighbor is not in the region (or does not exist)
                    if (r-1, c) not in region:
                        num_outside_connections += cond(var_in(self.grid[r][c], UP_CONNECTING + TOP_IN + TOP_OUT), 1, 0)
                    # bottom neighbor
                    if (r+1, c) not in region:
                        num_outside_connections += cond(var_in(self.grid[r][c], DOWN_CONNECTING + BOTTOM_IN + BOTTOM_OUT), 1, 0)
                    # left neighbor
                    if (r, c-1) not in region:
                        num_outside_connections += cond(var_in(self.grid[r][c], LEFT_CONNECTING + LEFT_IN + LEFT_OUT), 1, 0)
                    # right neighbor
                    if (r, c+1) not in region:
                        num_outside_connections += cond(var_in(self.grid[r][c], RIGHT_CONNECTING + RIGHT_IN + RIGHT_OUT), 1, 0)
                # we should have either 0 outside connections (loop doesn't hit this region) or 2 outside connections (in/out)
                require(num_outside_connections < 3)

    def hit_every_region(self, regions, every_loop = False):
        '''
        Given a set of regions (where each region is composed of (r, c) coordinate tuples),
        requires that some loop hits every region.
        
        every_loop = True iff every loop needs to visit every region
        '''
        if self.max_num_loops > 1 and every_loop:
            # every region must have
            for region in regions:
                for loop_id in range(self.max_num_loops):
                    # at least one cell that belongs to this loop
                    require(at_least(1, [self.__loop_id[r][c] == loop_id for (r, c) in region]))
        else:
            for region in regions:
                # every region must have at least one non-isolated pattern
                require(at_least(1, [~var_in(self.grid[r][c], ISOLATED) for (r, c) in region]))
        
    def inside(self, coords):
        '''
        Given a collection of (r, c) coordinates, force all of them to be inside.
        '''
        for (r, c) in coords:
            is_inside = BoolVar(False)
            for y in range(r):
                is_loop_part = var_in(self.grid[y][c], LEFT_CONNECTING+LEFT_IN+LEFT_OUT)
                is_inside = (~is_inside & is_loop_part) | (is_inside & ~is_loop_part)
            require(var_in(self.grid[r][c], ISOLATED))
            require(is_inside)

    def outside(self, coords):
        '''
        Given a collection of (r, c) coordinates, force all of them to be outside.
        '''
        for (r, c) in coords:
            is_inside = BoolVar(False)
            for y in range(r):
                is_loop_part = var_in(self.grid[y][c], LEFT_CONNECTING+LEFT_IN+LEFT_OUT)
                is_inside = (~is_inside & is_loop_part) | (is_inside & ~is_loop_part)
            require(var_in(self.grid[r][c], ISOLATED))
            require(~is_inside)

    def solutions(self, format_function = None):
        '''
        Gets a list of solutions.
        Each solution is usually a list of loop patterns (one for each cell,
        in a left-to-right, top-to-bottom order)
        '''
        if format_function == None:
            def format(r, c):
                if self.grid[r][c].value() == '.':
                    return 'black'
                elif self.grid[r][c].value() == '':
                    return ''
                else:
                    return self.grid[r][c].value() + '.png'
            format_function = format
        return get_all_grid_solutions(self.grid, format_function = format_function)
