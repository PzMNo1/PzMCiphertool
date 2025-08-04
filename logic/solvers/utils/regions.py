from ..claspy import *
from .borders import *
from .grids import *
from .solutions import *

def full_bfs(rows, cols, borders, clues = None):
    '''
    Given puzzle dimensions (rows, cols), a list of border coordinates,
    and (optionally) a dictionary mapping clue cells to values,
    
    Returns:
        if clues were provided:
            a dictionary mapping each clue cell to a frozenset of
                the (r, c) coordinates of the room that the clue is in
            (if a room has no clue cells, it gets ignored)
        else:
            a set of frozensets, where each frozenset contains the (r, c)
                coordinates of an entire room
    '''
    # initially, all cells are unexplored
    unexplored_cells = {(r,c) for c in range(cols) for r in range(rows)}
    
    # build a set of rooms
    # (if there are clues, we need this for stranded-edge checks)
    room_set = set()
    if clues:
        # build a mapping of (clue cell coordinate): {the entire room}
        clue_to_room = {}
        
    # --- HELPER METHOD FOR full_bfs---
    def bfs(start_cell):
        # find the clue cell in this room
        clue_cell = None
        # keep track of which cells are in this connected component
        connected_component = {start_cell}

        # the start cell has now been explored
        unexplored_cells.remove(start_cell)
        
        # bfs!
        frontier = {start_cell}
        while frontier:
            new_frontier = set()
            for (r,c) in frontier:
                # build a set of coordinates that are not divided by borders
                # (they don't have to be part of the grid;
                # we'll check for membership / validity later)
                neighbors = set()
                if (r, c, Direction.LEFT) not in borders:
                    neighbors.add((r,c-1))
                if get_edge_id(rows, cols, r, c, Direction.RIGHT) not in borders:
                    neighbors.add((r,c+1))
                if (r, c, Direction.TOP) not in borders:
                    neighbors.add((r-1,c))
                if get_edge_id(rows, cols, r, c, Direction.BOTTOM) not in borders:
                    neighbors.add((r+1,c))
                # find the clue cell
                if clues != None and (r, c) in clues:
                    clue_cell = (r,c)
                # for each neighbor that is a valid grid cell and not in this
                # connected component:
                for neighbor in neighbors:
                    if neighbor in unexplored_cells:
                        connected_component.add(neighbor)
                        unexplored_cells.remove(neighbor)
                        new_frontier.add(neighbor)
            frontier = new_frontier
        return clue_cell, frozenset(connected_component)
        
    while len(unexplored_cells) != 0:
        # get a random start cell
        iterator = iter(unexplored_cells)
        start_cell = next(iterator)
        # run bfs on that connected component
        clue, room = bfs(start_cell)
        # add the room to the room-set
        room_set.add(room)
        if clue != None:
            clue_to_room[clue] = room
    
    # --- HELPER METHOD FOR FINDING WHICH ROOM A CELL BELONGS TO ---
    def get_room(r, c):
        for room in room_set:
            if (r, c) in room:
                return room
    
    # check that there are no stranded edges
    for r, c, d in borders:
        if d == Direction.LEFT:
            # if there is a left neighbor
            if is_valid_coord(rows, cols, r, c-1):
                room = get_room(r, c)
                # make sure it's not in the same room
                if (r, c-1) in room:
                    raise ValueError('There is a dead-end edge.')
        elif d == Direction.TOP:
            if is_valid_coord(rows, cols, r-1, c):
                room = get_room(r, c)
                if (r-1, c) in room:
                    raise ValueError('There is a dead-end edge.')
        elif d == Direction.RIGHT:
            if is_valid_coord(rows, cols, r, c+1):
                room = get_room(r, c)
                if (r, c+1) in room:
                    raise ValueError('There is a dead-end edge.')
        elif d == Direction.BOTTOM:
            if is_valid_coord(rows, cols, r+1, c):
                room = get_room(r, c)
                if (r+1, c) in room:
                    raise ValueError('There is a dead-end edge.')
                    
    if clues:
        return clue_to_room
    return room_set

class RectangularGridRegionSolver:
    '''
    Solves puzzles that involve regions.
    
    The regions may be provided as part of the input, or may be unknown
    and part of the solution.
    
    Can be a "main" or "auxiliary" solver.
    '''
    def __init__(self, rows, cols, grid = None, given_regions = None, max_num_regions = None,
        region_symbol_sets = None, nonregion_area_connected = False):
        '''
        rows = # rows
        cols = # columns
        grid = grid that this region solver is applying constraints to,
            or None if the main goal of the puzzle is to find regions
            (max_num_regions must be specified)
        given_regions = None iff the puzzle input doesn't have regions
            (it is expected that when given_regions == None,
                max_num_regions and region_symbol_sets != None),
            or a dictionary mapping clue cells to regions /
                a set of regions (as would be returned by full_bfs)
        max_num_regions = the maximum number of regions possible
            (it is expected that if max_num_regions != None,
                given_regions == None and region_symbol_sets != None),
            or None if the regions are already known
        region_symbol_sets = a collection of collections, where each
            inner collection contains the symbols which belong to the same
            "region type"
            (it is expected that if region_symbol_sets != None,
                given_regions == None and max_num_regions != None),
            or None if the regions are already known
        nonregion_cell_ids = A collection of IDs to be used for cells which are
            not considered to be part of any "important" region.
            Make sure the "max_num_regions" you supply is large enough to include
            the special "nonregion ID"s).
        nonregion_cell_ids = True iff there's supposed to be one
            "white" (non-region) area which is orthogonally connected.
            This can't be True if nonregion_cell_ids is empty.
        '''
        self.__rows = rows
        self.__cols = cols
        if grid:
            self.__grid = grid
        else:
            if region_symbol_sets == None: # Explicitly check for None as opposed to empty collection
                region_symbol_sets = []
                for i in range(max_num_regions):
                    region_symbol_sets.append([i])
            self.__grid = RectangularGrid(rows, cols, lambda : IntVar(0, max_num_regions-1))
        if given_regions == None:
            if max_num_regions == None or region_symbol_sets == None:
                raise ValueError('If a grid is being provided and regions are not being provided, max # regions and symbol sets must be provided')
            self.make_regions(max_num_regions, region_symbol_sets, nonregion_area_connected)
            if not grid:
                for r in range(rows):
                    for c in range(cols):
                        require(self.__grid[r][c] == self.__region_id[r][c])
        else:
            self.__given_regions = given_regions
        
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
    def parent(self):
        return self.__parent
    @property
    def region_id(self):
        return self.__region_id
    @property
    def region_size(self):
        return self.__region_size
        
    def same_region_symbol(self, symbol1, symbol2):
        '''
        Return a BoolVar whose value is true iff symbol1 and symbol2 are equivalent.
        '''
        same_region_symbol = BoolVar(False)
        for symbol in self.__region_symbols:
            same_region_symbol |= (symbol1 == symbol) & var_in(symbol2, self.__region_symbols[symbol])
        return same_region_symbol
    
    # --- METHODS FOR PUZZLES IN WHICH REGIONS NOT PROVIDED AS PART OF INPUT ---
    def make_regions(self, max_num_regions, region_symbol_sets, nonregion_area_connected):
        '''
        Apply constraints that ensure that there at most max_num_regions,
        and that adjacent cells whose values belong to the same set of
        "region symbols" are marked as being part of the same region.

        nonregion_area_connected = True iff the "nonregion" cells (whose
            parent is 'x' and whose region ID is not part of region_symbol_sets)
            should all be connected to each other.
        '''
        self.__region_symbols = {}
        for symbol_set in region_symbol_sets:
            for symbol in symbol_set:
                self.__region_symbols[symbol] = symbol_set
        self.__parent = [[MultiVar('^','v','>','<','.','x') for c in range(self.cols)] for r in range(self.rows)]
        # maximum index of region_id = max_num_regions - 1
        self.__region_id = [[IntVar(0, max_num_regions-1) for c in range(self.cols)] for r in range(self.rows)]

        def is_part_of_region(r, c):
            if len(self.__region_symbols) == 0: # Somewhat degenerate case, but still needed
                return False
            else:
                return var_in(self.grid[r][c], self.__region_symbols)

        for r in range(self.rows):
            for c in range(self.cols):
                # If the "non-region" area must be connected, we can't use parent = 'x' because we need flow (see below).
                if nonregion_area_connected:
                    pass
                else:
                    require(is_part_of_region(r, c) == (self.__parent[r][c] != 'x'))

        # flow_c is a grid of Atoms used to ensure that all cells are
        # connected along the parent pointer field to a root cell.
        flow_c = [[Atom() for c in range(self.cols)] for r in range(self.rows)]
        for r in range(self.rows):
            for c in range(self.cols):
                # The root cell is proven.
                flow_c[r][c].prove_if(self.__parent[r][c] == '.')
                # All unshaded cells must be proven by following the flow
                # backwards from the root.
                if r > 0:
                    flow_c[r][c].prove_if((self.__parent[r][c] == '^') & flow_c[r-1][c] &
                                          (self.__region_id[r][c] == self.__region_id[r-1][c]))
                if r < self.rows-1:
                    flow_c[r][c].prove_if((self.__parent[r][c] == 'v') & flow_c[r+1][c] &
                                          (self.__region_id[r][c] == self.__region_id[r+1][c]))
                if c > 0:
                    flow_c[r][c].prove_if((self.__parent[r][c] == '<') & flow_c[r][c-1] &
                                          (self.__region_id[r][c] == self.__region_id[r][c-1]))
                if c < self.cols-1:
                    flow_c[r][c].prove_if((self.__parent[r][c] == '>') & flow_c[r][c+1] &
                                          (self.__region_id[r][c] == self.__region_id[r][c+1]))
                if nonregion_area_connected:
                    # If the non-region area needs to be connected, then all cells must have flow.
                    require(flow_c[r][c])
                else:
                    # all cells that are "region symbols" must have flow
                    require(flow_c[r][c] | ~is_part_of_region(r, c))

        # if vertically adjacent cells are both in a region,
        # they have the same region value iff they are in the same region.
        for r in range(self.rows-1):
            for c in range(self.cols):
                require(
                    # same region value iff in same region
                    (self.same_region_symbol(self.grid[r+1][c], self.grid[r][c]) ==
                    (self.__region_id[r+1][c] == self.__region_id[r][c])) |
                    # or at least one is not in a region
                    (~is_part_of_region(r+1, c) | ~is_part_of_region(r, c))
                )
                
        # if horizontally adjacent cells are both in a region,
        # they have the same region value iff they are in the same region.
        for r in range(self.rows):
            for c in range(self.cols-1):
                require(
                    # same region value iff in same region
                    (self.same_region_symbol(self.grid[r][c+1], self.grid[r][c]) ==
                    (self.__region_id[r][c+1] == self.__region_id[r][c])) |
                    # or at least one is not in a region
                    (~is_part_of_region(r, c+1) | ~is_part_of_region(r, c))
                )

        # Require that each region has at most 1 root
        for i in range(max_num_regions):
            require(at_most(1, [(self.__region_id[r][c] == i) & \
                (self.__parent[r][c] == '.') \
                for r in range(self.rows) for c in range(self.cols)]))

    def set_region_size(self, max_region_size, clue_cells, min_region_size = 0, clue_region_bijection = False):
        '''
        Require that the maximum region size <= max_region_size,
        and that clue cells which tell us how large a region should be
        are all satisfied.
        
        clue_region_bijection is True iff there is exactly one region per clue.
        If clue_region_bijection is False, then if a clue cell
        happens to be a region root, make sure it's satisfied
        (otherwise, ignore)
        '''
        # Keep track, for each cell, of the size of the region it belongs to.
        self.__region_size = [[IntVar(min_region_size, max_region_size) for c in range(self.cols)] for r in range(self.rows)]
        # To count cells in a group, create a grid of IntVars, where each value
        # is the sum of the values that flow towards it, plus one.
        upstream = [[IntVar(0, max_region_size) for c in range(self.cols)] for r in range(self.rows)]
        for r in range(self.rows):
            for c in range(self.cols):
                upstream_count = IntVar(0)
                
                if r > 0:
                    # Update upstream count
                    upstream_count += cond(self.__parent[r-1][c] == 'v', upstream[r-1][c], 0)
                    # If this cell is the parent of its upper neighbor, they have the same region size.
                    require((self.__region_size[r][c] == self.__region_size[r-1][c]) | (self.__parent[r-1][c] != 'v'))
                    
                if r < self.rows-1:
                    upstream_count += cond(self.__parent[r+1][c] == '^', upstream[r+1][c], 0)
                    require((self.__region_size[r][c] == self.__region_size[r+1][c]) | (self.__parent[r+1][c] != '^'))
                    
                if c > 0:
                    upstream_count += cond(self.__parent[r][c-1] == '>', upstream[r][c-1], 0)
                    require((self.__region_size[r][c] == self.__region_size[r][c-1]) | (self.__parent[r][c-1] != '>'))
                    
                if c < self.cols-1:
                    upstream_count += cond(self.__parent[r][c+1] == '<', upstream[r][c+1], 0)
                    require((self.__region_size[r][c] == self.__region_size[r][c+1]) | (self.__parent[r][c+1] != '<'))
                    
                # if cell is part of some region, it must obey the upstream counting rule;
                # otherwise, its count is 0.
                require(cond(var_in(self.grid[r][c], self.__region_symbols), (upstream[r][c] == upstream_count + 1), upstream[r][c] == 0))
                
                # If there is exactly one clue per region
                if clue_region_bijection:
                    # and this is a root cell, then the count must match the cell's value.
                    if (r, c) in clue_cells:
                        require((self.__parent[r][c] == '.') & (upstream[r][c] == clue_cells[(r, c)]) & self.__region_size[r][c] == clue_cells[(r, c)])
                    # this isn't a root cell
                    else:
                        require(self.__parent[r][c] != '.')
                # A clue which is a root implies count
                else:
                    # If this is a root, the region size is equal to its upstream count
                    require(
                        (self.__parent[r][c] != '.') |
                        (upstream[r][c] == self.__region_size[r][c])
                    )
                    if (r, c) in clue_cells:
                        require(self.__region_size[r][c] == clue_cells[(r, c)])

    def region_roots(self, region_root_to_id, region_symbol_set = None, exact = False,
        unassigned_region_id_constraint = None):
        '''
        Set the "roots" of the regions.
        
        region_root_to_id maps region roots to region IDs.
        region_symbol_set specifies the region symbol set that
            the provided region roots belong to.
            If it is "None", then the provided region roots are the only ones that exist,
            for any type.
        exact is true iff the provided roots are the only roots that exist
            within regions of the appropriate type.
        unassigned_region_id_constraint specifies how region roots not in region_root_to_id
            are assigned IDs. If not specified, it defaults to
            lambda region_id_grid, r, c : (region_id_grid[r][c] == r*self.cols + c)
        '''
        if not unassigned_region_id_constraint:
            unassigned_region_id_constraint = lambda region_id_grid, r, c : (region_id_grid[r][c] == r*self.cols + c)
        for r in range(self.rows):
            for c in range(self.cols):
                if (r, c) in region_root_to_id:
                    # if a region symbol set is specified, make sure this cell belongs to it
                    if region_symbol_set:
                        require(var_in(self.grid[r][c], region_symbol_set))
                    require(self.__parent[r][c] == '.')
                    require(self.__region_id[r][c] == region_root_to_id[(r,c)])
                else:
                    if exact:
                        if region_symbol_set:
                            # this cannot be a region root in the correct symbol set
                            require(
                                ~(var_in(self.grid[r][c], region_symbol_set) & (self.__parent[r][c] == '.'))
                            )
                            # if this isn't in the correct symbol set and it is a root,
                            # its region ID must be equal to its cell ID
                            require(
                                (unassigned_region_id_constraint(self.__region_id, r, c)) |
                                    (self.__parent[r][c] != '.') |
                                    var_in(self.grid[r][c], region_symbol_set)
                            )
                        else:
                            require(self.__parent[r][c] != '.')
                    else:
                        # if it is a root, its region id must be its cell id
                        require(
                            (unassigned_region_id_constraint(self.__region_id, r, c)) |
                                (self.__parent[r][c] != '.')
                        )
    
    def set_num_neighbors_in_different_region(self, r, c, n):
        '''
        Require that the number of neighbors the cell at (r, c) has
        that are not in the same region as it is equal to n.
        '''
        neighbors = self.grid.get_neighbors(r, c)
        num_neighbors = len(neighbors)
        num_extra_edges = 4 - num_neighbors

        # "neighbors" which are outside of the grid are considered to
        # be "in a different region"
        require(sum_bools(n - num_extra_edges, 
            [self.__region_id[r][c] != self.__region_id[y][x] for (y, x) in neighbors]))
    
    # --- METHODS FOR PUZZLES IN WHICH REGIONS ARE PART OF THE INPUT ---
    def set_shaded_cells_in_region(self, clues, shading_symbols):
        '''
        Given a dictionary mapping (r, c) coordinates to clue values
        which indicate the number of shaded cells that must be in that region,
        
        Require that the clues are satisfied
        '''
        for (r,c) in clues:
            shaded_room_cells = [
                var_in(self.grid[y][x], shading_symbols) \
                    for (y,x) in self.get_region(r, c)
            ]
            require(sum_bools(clues[(r,c)], shaded_room_cells))
    
    def set_unshaded_cells_in_region(self, clues, shading_symbols):
        '''
        Given a dictionary mapping (r, c) coordinates to clue values
        which indicate the number of unshaded cells that must be in that region,
        
        Require that the clues are satisfied
        '''
        for (r,c) in clues:
            unshaded_room_cells = [
                ~var_in(self.grid[y][x], shading_symbols) \
                    for (y,x) in self.get_region(r, c)
            ]
            require(sum_bools(clues[(r,c)], unshaded_room_cells))
    
    def get_region(self, r, c):
        '''
        Returns a frozenset, which contains all of the cells in the region
        that (r, c) is in.
        '''
        if isinstance(self.__given_regions, dict):
            for region in self.__given_regions.values():
                if (r, c) in region:
                    return region
        else:
            for region in self.__given_regions:
                if (r, c) in region:
                    return region
    
    def get_shaded_cells_in_region(self, r, c, shading_symbols):
        '''
        Returns the number of shaded cells in the region that contains (r, c).
        '''
        return sum_vars([var_in(self.grid[y][x], shading_symbols) \
            for (y, x) in self.get_region(r, c)
        ])
                
    def get_unshaded_cells_in_region(self, r, c, shading_symbols):
       '''
       Returns the number of unshaded cells in the region that contains (r, c).
       '''
       return IntVar(sum_vars([~var_in(self.grid[y][x], shading_symbols) \
           for (y, x) in self.get_region(r, c)
       ]))
               
    def is_in_same_region(self, r1, c1, r2, c2):
        '''
        Returns true iff (r1, c1) and (r2, c2) are in the same region.
        '''
        return self.get_region(r1, c1) == self.get_region(r2, c2)
    
    def get_neighbors_in_other_regions(self, r, c):
        '''
        Return a list of coordinates which are neighbors of (r, c)
        and not in the same region as it.
        '''
        return list(filter(
            lambda neighbor: not self.is_in_same_region(r, c, *neighbor),
                self.grid.get_neighbors(r, c)
            ))

    # --- RETRIEVE THE BORDER COORDINATES OF THE SOLUTION ---
    def solutions(self):
        def generate_solution():
            border_coords = {}
            for r in range(self.rows):
                for c in range(self.cols):
                    # handle left / right edges
                    if c == 0:
                        border_coords[get_border_coord_from_edge_id(r, c, Direction.LEFT)] = 'black'
                    if c == self.cols-1:
                        if self.__region_id[r][c-1].value() != self.__region_id[r][c].value():
                            border_coords[get_border_coord_from_edge_id(r, c, Direction.LEFT)] = 'black'
                        # right edge is always colored
                        border_coords[get_border_coord_from_edge_id(r, c, Direction.RIGHT)] = 'black'
                    else:
                        if self.__region_id[r][c-1].value() != self.__region_id[r][c].value():
                            border_coords[get_border_coord_from_edge_id(r, c, Direction.LEFT)] = 'black'
                    # handle top / bottom edges
                    if r == 0:
                        border_coords[get_border_coord_from_edge_id(r, c, Direction.TOP)] = 'black'
                    if r == self.rows-1:
                        if self.__region_id[r-1][c].value() != self.__region_id[r][c].value():
                            border_coords[get_border_coord_from_edge_id(r, c, Direction.TOP)] = 'black'
                        # bottom edge is always black
                        border_coords[get_border_coord_from_edge_id(r, c, Direction.BOTTOM)] = 'black'
                    else:
                        if self.__region_id[r-1][c].value() != self.__region_id[r][c].value():
                            border_coords[get_border_coord_from_edge_id(r, c, Direction.TOP)] = 'black'
            return border_coords
        
        def avoid_duplicate_solution():
            x = BoolVar(True)
            for r in range(self.rows):
                for c in range(self.cols-1):
                    x &= (
                        (self.__region_id[r][c+1] == self.__region_id[r][c]) == \
                            (self.__region_id[r][c+1].value() == self.__region_id[r][c].value())
                    )
            for r in range(self.rows-1):
                for c in range(self.cols):
                    x &= (
                        (self.__region_id[r+1][c] == self.__region_id[r][c]) == \
                            (self.__region_id[r+1][c].value() == self.__region_id[r][c].value())
                    )
            require(~x)

        return get_all_solutions(generate_solution, avoid_duplicate_solution)
