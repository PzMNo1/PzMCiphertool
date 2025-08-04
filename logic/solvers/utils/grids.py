from enum import Enum

Type = Enum('Type', 'RECT HEX')

def is_valid_coord(rows, cols, r, c):
    '''
    Given puzzle dimensions (rows, cols), and a specific (r, c) coordinate,
    Returns True iff (r, c) is a valid grid coordinate.
    '''
    return 0 <= r < rows and 0 <= c < cols

def get_neighbors(rows, cols, r, c):
    '''
    Given puzzle dimensions (rows, cols), and a specific (r, c) coordinate,
    
    Returns the 90-degree neighbors of (r, c).
    '''
    neighbors = []
    for (y, x) in ((r-1, c), (r+1, c), (r, c-1), (r, c+1)):
        if is_valid_coord(rows, cols, y, x):
            neighbors.append((y, x))
    return neighbors
    
def get_surroundings(rows, cols, r, c):
    '''
    Given puzzle dimensions (rows, cols), and a specific (r, c) coordinate,
    Returns the surroundings (includes diagonals) of (r, c).
    '''
    surroundings = []
    for y in range(r-1, r+2):
        for x in range(c-1, c+2):
            if (y, x) != (r, c) and is_valid_coord(rows, cols, y, x):
                surroundings.append((y, x))
    return surroundings

def manhattan_distance(r1c1, r2c2):
    return abs(r1c1[0]-r2c2[0]) + abs(r1c1[1]-r2c2[1])

class RectangularGrid:
    '''
    Represents a puzzle as a list of lists, where each internal list
    represents a row of the puzzle.
    
    Each cell is of the same type as all the others.
    '''
    def __init__(self, rows, cols, seed_function):
        '''
        rows = # rows
        cols = # columns
        seed_function = a function which, when called, yields a value
        of the appropriate type for this puzzle
        '''
        self.__rows = rows
        self.__cols = cols
        self.__type = Type.RECT
        try:
            self.__grid = [[seed_function() for c in range(cols)] for r in range(rows)]
        except:
            self.__grid = [[seed_function(r,c) for c in range(cols)] for r in range(rows)]
    @property
    def rows(self):
        return self.__rows
    @property
    def cols(self):
        return self.__cols
    @property
    def type(self):
        return self.__type
    def __getitem__(self, key):
        if type(key) == tuple:
            return self.__grid[key[0]][key[1]]
        else:
            return self.__grid[key]
    def __len__(self):
        return self.__rows
    def is_valid_coord(self, r, c):
        '''
        Returns True iff (r, c) is a valid coordinate for this grid.
        '''
        return is_valid_coord(self.rows, self.cols, r, c)
    def get_neighbors(self, r, c):
        '''
        Returns the 90-degree neighbors of (r, c) in this grid.
        '''
        return get_neighbors(self.rows, self.cols, r, c)
    def get_surroundings(self, r, c):
        '''
        Returns the surroundings (includes diagonals) of (r, c) in this grid.
        '''
        return get_surroundings(self.rows, self.cols, r, c)
    def iter_coords(self):
        for r in range(self.rows):
            for c in range(self.cols):
                yield (r,c)