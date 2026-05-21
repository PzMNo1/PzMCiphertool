from ..claspy import *
from .grids import *
from .solutions import *
from enum import Enum

Direction = Enum('Direction', 'LEFT TOP RIGHT BOTTOM')
DEFAULT_DIRECTIONS = {Direction.LEFT, Direction.TOP}
            
def get_edge_id_from_border_coord(rows, cols, i, j):
    '''
    Given the dimensions (rows and cols) of a puzzle grid,
    and a border coordinate (i, j),
    
    Returns the canonical edge id of the edge.
    '''
    if j % 2 == 0:
        if j//2 == cols:
            return (i//2, j//2, Direction.RIGHT)
        else:
            return (i//2, j//2, Direction.LEFT)
    else:
        if i//2 == rows:
            return (i//2, j//2, Direction.BOTTOM)
        else:
            return (i//2, j//2, Direction.TOP)
                        
def get_border_coord_from_edge_id(r, c, d):
    '''
    Given an edge id,
    
    Returns the border coordinate of the edge.
    '''
    if d == Direction.TOP:
        return '{},{}'.format(r*2, c*2+1)
    elif d == Direction.LEFT:
        return '{},{}'.format(r*2+1, c*2)
    elif d == Direction.BOTTOM:
        return '{},{}'.format((r+1)*2, c*2+1)
    elif d == Direction.RIGHT:
        return '{},{}'.format(r*2+1, (c+1)*2)

def get_edge_id(rows, cols, r, c, d):
    '''
    Given row and column coordinates and a direction,
    returns the edge id (the canonical tuple representation).

    e.g. (0, 0, bottom) -> (1, 0, top)
    '''
    if d in DEFAULT_DIRECTIONS:
        return (r, c, d)
    elif d == Direction.RIGHT:
        if c == cols-1:
            return (r, c, Direction.RIGHT)
        else:
            return (r, c+1, Direction.LEFT)
    elif d == Direction.BOTTOM:
        if r == rows-1:
            return (r, c, Direction.BOTTOM)
        else:
            return (r+1, c, Direction.TOP)
    else:
        raise RuntimeError(
            "Expected 'd' to be a valid Direction enum value")

class RectangularGridBorderSolver:
    '''
    Solves puzzles which involve the act of specifically drawing borders.
    '''
    def __init__(self, rows, cols, region_solver = None):
        self.__rows = rows
        self.__cols = cols
        self.__region_solver = region_solver
        self.__is_shaded = {}
        self.__connectivity = {}
        self.__chosen = {}
        for r in range(rows):
            for c in range(cols):
                for direction in DEFAULT_DIRECTIONS:
                    key = (r, c, direction)
                    self.__is_shaded[key], self.__connectivity[key], self.__chosen[key] = \
                                BoolVar(), Atom(), BoolVar()
                if r == rows-1:
                    key = (r, c, Direction.BOTTOM)
                    self.__is_shaded[key], self.__connectivity[key], self.__chosen[key] = \
                                BoolVar(), Atom(), BoolVar()
                if c == cols-1:
                    key = (r, c, Direction.RIGHT)
                    self.__is_shaded[key], self.__connectivity[key], self.__chosen[key] = \
                                BoolVar(), Atom(), BoolVar()
        
        # expect that the grid is a region solver
        if self.__region_solver:
            self.constrain_using_region_ids(self.__region_solver.region_id)
    @property
    def rows(self):
        return self.__rows
    @property
    def cols(self):
        return self.__cols
    def is_shaded(self, r, c, d):
        return self.__is_shaded[get_edge_id(self.rows, self.cols, r, c, d)]
    def get_edge_neighbors(self, r, c, d):
        '''
        Given an edge in (possibly non-canonical) representation,

        Returns a list of lists [in_neighbors, out_neighbors], where:
            - in_neighbors: is a list of the canonical representations
            of the edges which "feed in" to the given edge, where
            "in" is considered to be the topmost or leftmost "entry point"
            - out_neighbors: is a list of the canonical representations
            of the edges which "leave" the given edge, where "out" is
            considered to be the bottommost or rightmost "exit point"
        '''
        
        # --- HELPER METHOD FOR 'get_edge_neighbors' ---
        
        def get_valid_neighbors(possible_neighbors):
            '''
            Given a list of canonical representations of edges which
            would be neighbors if they existed,

            Returns only the ones which actually do exist.
            '''
            neighbors = []
            for y, x, d in possible_neighbors:
                if 0 <= y < self.rows and 0 <= x < self.cols:
                    neighbors.append((y, x, d))
            return neighbors


        # --- BEGIN METHOD BODY of 'get_edge_neighbors' ---

        rows, cols = self.rows, self.cols
        if d == Direction.LEFT:
            # if this is a left edge, its "in" edges feed into it
            # from the top.
            #
            # if the current edge is marked by * in the diagram below,
            # the "in" edges must be the ones which are marked with x
            #
            #   ----- -----
            #  |     |     |
            #  |     x     |
            #  |     |     |
            #   --x-- --x--
            #  |     |     |
            #  |     *     |
            #  |     |     |
            #   ----- -----
            return [
                # get in edges
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r, c-1, Direction.TOP),
                     get_edge_id(rows, cols, r, c, Direction.TOP),
                     get_edge_id(rows, cols, r-1, c, Direction.LEFT))),
                
                # get out edges
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r, c-1, Direction.BOTTOM),
                     get_edge_id(rows, cols, r, c, Direction.BOTTOM),
                     get_edge_id(rows, cols, r+1, c, Direction.LEFT)))
                ]

        # the logic is similar for the other cases
        elif d == Direction.TOP:
            return [
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r-1, c, Direction.LEFT),
                     get_edge_id(rows, cols, r, c, Direction.LEFT),
                     get_edge_id(rows, cols, r, c-1, Direction.TOP))),
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r-1, c, Direction.RIGHT),
                     get_edge_id(rows, cols, r, c, Direction.RIGHT),
                     get_edge_id(rows, cols, r, c+1, Direction.TOP)))
                ]
        elif d == Direction.RIGHT:
            return [
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r, c, Direction.TOP),
                     get_edge_id(rows, cols, r, c+1, Direction.TOP),
                     get_edge_id(rows, cols, r-1, c, Direction.RIGHT))),
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r, c, Direction.BOTTOM),
                     get_edge_id(rows, cols, r, c+1, Direction.BOTTOM),
                     get_edge_id(rows, cols, r+1, c, Direction.RIGHT)))
                ]
        elif d == Direction.BOTTOM:
            return [
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r, c, Direction.LEFT),
                     get_edge_id(rows, cols, r+1, c, Direction.LEFT),
                     get_edge_id(rows, cols, r, c-1, Direction.BOTTOM))),
                get_valid_neighbors(
                    (get_edge_id(rows, cols, r, c, Direction.RIGHT),
                     get_edge_id(rows, cols, r+1, c, Direction.RIGHT),
                     get_edge_id(rows, cols, r, c+1, Direction.BOTTOM)))
                ]
        else:
            raise RuntimeError(
                "Expected 'd' to be a valid Direction enum value")
    def loop(self, min_num_loops = 1, max_num_loops = 1):
        '''
        Add requirements to make sure that the loops present in
        the grid are valid.
        '''
        row, cols = self.rows, self.cols
        is_shaded, connectivity, chosen = self.__is_shaded, self.__connectivity, self.__chosen
        for (r, c, d) in is_shaded:
            in_neighbors, out_neighbors = self.get_edge_neighbors(r, c, d)

            # each edge has
            require(
                # exactly 1 in-neighbor and
                ((at_most(1, [is_shaded[n] for n in in_neighbors])
                     & at_least(1, [is_shaded[n] for n in in_neighbors])) &

                 # exactly 1 out-neighbor
                (at_most(1, [is_shaded[n] for n in out_neighbors])
                     & at_least(1, [is_shaded[n] for n in out_neighbors]))) |

                # if it is shaded.
                ~is_shaded[(r, c, d)])

            # an edge is connected if
            for n in in_neighbors + out_neighbors:
                connectivity[(r, c, d)].prove_if(
                    # it's connected to another connected shaded edge, or
                    (is_shaded[n] & connectivity[n]) |

                    # it's being used as the "loop anchor".
                        chosen[(r, c, d)])

            # an edge is either connected or unshaded.
            require(connectivity[(r, c, d)] | ~is_shaded[(r, c, d)])

        # constrain the number of loops
        require(at_least(min_num_loops, list(chosen.values())))
        require(at_most(max_num_loops, list(chosen.values())))
    def clues(self, clue_cells):
        '''
        Given a dictionary mapping (r, c) coordinates to the number of
        borders around those cells that must be drawn,
        
        Adds the requirements to make sure that the clues are satisfied.
        '''
        for (r, c) in clue_cells:
            borders = [self.__is_shaded[get_edge_id(self.rows, self.cols, r, c, d)] for d in Direction]
            
            # exactly (clue #) of the borders are shaded
            require(sum_bools(clue_cells[(r,c)], borders))
    def inside_loop(self, inside_cells):
        '''
        Given a collection of (r, c) coordinates,
        
        Requires that those (r, c) coordinates are all inside of some loop.
        '''
        for (r, c) in inside_cells:
            even_num_edges_encountered = BoolVar(True)
            for x in range(0, c+1):
                even_num_edges_encountered = \
                    (self.is_shaded(r, x, Direction.LEFT) & ~even_num_edges_encountered) | \
                        (~self.is_shaded(r, x, Direction.LEFT) & even_num_edges_encountered)
            require(~even_num_edges_encountered)
    def outside_loop(self, outside_cells):
        '''
        Given a collection of (r, c) coordinates,
        
        Requires that those (r, c) coordinates are all outside of all loops.
        '''
        for (r, c) in outside_cells:
            even_num_edges_encountered = BoolVar(True)
            for x in range(0, c+1):
                even_num_edges_encountered = \
                    (self.is_shaded(r, x, Direction.LEFT) & ~even_num_edges_encountered) | \
                        (~self.is_shaded(r, x, Direction.LEFT) & even_num_edges_encountered)
            require(even_num_edges_encountered)
    def constrain_using_region_ids(self, region_id):
        '''
        Given a grid full of region IDs, of size self.rows x self.cols,
        enforce that borders are drawn between regions of differing IDs.
        '''
        for r in range(self.rows):
            for c in range(self.cols):
                # handle left / right edges
                if c == 0:
                    require(self.__is_shaded[(r, c, Direction.LEFT)])
                elif c == self.cols-1:
                    # left edge is conditional
                    require(self.__is_shaded[(r, c, Direction.LEFT)] != (region_id[r][c-1] == region_id[r][c]))
                    # right edge is always colored
                    require(self.__is_shaded[(r, c, Direction.RIGHT)])
                else:
                    # left edge is conditional
                    require(self.__is_shaded[(r, c, Direction.LEFT)] != (region_id[r][c-1] == region_id[r][c]))
                # handle top / bottom edges
                if r == 0:
                    require(self.__is_shaded[(r, c, Direction.TOP)])
                elif r == self.rows-1:
                    # top edge is conditional
                    require(self.__is_shaded[(r, c, Direction.TOP)] != (region_id[r-1][c] == region_id[r][c]))
                    # bottom edge always
                    require(self.__is_shaded[(r, c, Direction.BOTTOM)])
                else:
                    # top edge is conditional
                    require(self.__is_shaded[(r, c, Direction.TOP)] != (region_id[r-1][c] == region_id[r][c]))
    def solutions(self):
        '''
        Get a list of solutions, where each solution is a list
        consisting of the border coordinates of the borders that
        need to be drawn.
        '''
        def generate_solution():
            solution = {}
            for edge in self.__is_shaded:
                if self.__is_shaded[edge].value():
                    solution[get_border_coord_from_edge_id(*edge)] = 'black'
            return solution
            
        def avoid_duplicate_solution():
            x = BoolVar(True)
            for edge in self.__is_shaded:
                x = x & (self.__is_shaded[edge] == self.__is_shaded[edge].value())
            require(~x)
                
        return get_all_solutions(generate_solution, avoid_duplicate_solution)
