from .grids import *

OMINOES = {
    4: {
        'T': ((0, 0), (1, 0), (1, 1), (2, 0)),
        'O': ((0, 0), (0, 1), (1, 0), (1, 1)),
        'I': ((0, 0), (1, 0), (2, 0), (3, 0)),
        'L': ((0, 0), (1, 0), (2, 0), (2, 1)),
        'S': ((0, 0), (0, 1), (1, 1), (1, 2))
    },
    5: {
        'F': ((0, 0), (0, 1), (1, -1), (1, 0), (2, 0)),
        'I': ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0)),
        'L': ((0, 0), (1, 0), (2, 0), (3, 0), (3, 1)),
        'N': ((0, 0), (0, 1), (1, 1), (1, 2), (1, 3)),
        'P': ((0, 0), (0, 1), (1, 0), (1, 1), (2, 0)),
        'T': ((0, 0), (0, 1), (0, 2), (1, 1), (2, 1)),
        'U': ((0, 0), (0, 2), (1, 0), (1, 1), (1, 2)),
        'V': ((0, 0), (1, 0), (2, 0), (2, 1), (2, 2)),
        'W': ((0, 0), (0, 1), (1, 1), (1, 2), (2, 2)),
        'X': ((0, 0), (1, -1), (1, 0), (1, 1), (2, 0)),
        'Y': ((0, 0), (1, -1), (1, 0), (1, 1), (1, 2)),
        'Z': ((0, 0), (0, 1), (1, 1), (2, 1), (2, 2))
    }
}

def string_to_canon_shape(string):
    '''
    Given a string representation of a shape, either 
     - using spaces and non-space characters only, e.g.
        *
        *
        **
     - or using tabs to separate the pieces, e.g.
        *
        *
        *   *
    Return the canonicalized version of the shape.
    '''
    width, height = 0, 0
    cells = []
    if '\t' in string:
        for line in string.split('\n'):
            if line != '':
                tab_parts = line.split('\t')
                cells.append(tab_parts)
                width = max(width, len(tab_parts))
                height += 1
    else:
        for line in string.split('\n'):
            if line != '':
                cells.append(list(line))
                width = max(width, len(line))
                height += 1
    shape = []
    for r in range(height):
        for c in range(width):
            try:
                if not cells[r][c].isspace():
                    shape.append((r,c))
            except IndexError:
                pass
    return canonicalize_shape(shape)

def canonicalize_shape(shape):
    '''
    Given a (possibly non-canonical) shape representation,
    
    Return the canonical representation of the shape, a tuple:
        - in sorted order
        - whose first element is (0, 0)
        - whose other elements represent the offsets of
        the other cells from the first one
    '''
    shape = sorted(shape)
    root_y, root_x = shape[0]
    dy, dx = -1*root_y, -1*root_x
    return tuple((y+dy, x+dx) for y, x in shape)
    
def rotate(shape):
    '''
    Rotate a shape 90 degrees.
    '''
    return canonicalize_shape((-x, y) for y, x in shape)

def reflect(shape):
    '''
    Reflect a shape.
    '''
    return canonicalize_shape((-y, x) for y, x in shape)

def get_variants(shape, allow_rotations, allow_reflections):
    '''
    Get a set of canonical shape representations for a
    (possibly non-canonical) shape representation.
    
    allow_rotations = True iff shapes can be rotated
    allow_reflections = True iff shapes can be reflected
    '''
    # build a set of functions that transform shapes
    # in the desired ways
    functions = set()
    if allow_rotations:
        functions.add(rotate)
    if allow_reflections:
        functions.add(reflect)
    
    # make a set of currently found shapes
    result = set()
    result.add(canonicalize_shape(shape))
    
    # apply our functions to the items in this set,
    # then add the results (new shapes) into the set,
    # and do this repeatedly until the set stops growing
    all_shapes_covered = False
    while not all_shapes_covered:
        new_shapes = set()
        current_num_shapes = len(result)
        for f in functions:
            for s in result:
                new_shapes.add(f(s))
        result = result.union(new_shapes)
        all_shapes_covered = (current_num_shapes == len(result))
    return result

def place_shape_in_grid(rows, cols, shape, anchor_r, anchor_c):
    '''
    Given the dimensions of a puzzle (rows, cols),
    a canonical representation of a shape,
    and an anchor point (anchor_r, anchor_c),
    
    Try to place the shape such that its "root" (first tuple element)
    is located at (anchor_r, anchor_c).
    
    Return None if the shape doesn't fit in the grid, and a list of
    coordinates of each of the cells of the shape otherwise.
    '''
    absolute_coords = []
    for dy, dx in shape:
        y, x = anchor_r + dy, anchor_c + dx
        if is_valid_coord(rows, cols, y, x):
            absolute_coords.append((y, x))
        else:
            return None
    return tuple(absolute_coords)

def place_shape_in_region(region, shape, anchor_r, anchor_c):
    '''
    Given the a list of (r, c) coordinates that make up a region,
    a canonical representation of a shape,
    and an anchor point (anchor_r, anchor_c),
    
    Try to place the shape such that its "root" (first tuple element)
    is located at (anchor_r, anchor_c).
    
    Return None if the shape doesn't fit in the region, and a list of
    coordinates of each of the cells of the shape otherwise.
    '''
    absolute_coords = []
    for dy, dx in shape:
        y, x = anchor_r + dy, anchor_c + dx
        if (y, x) in region:
            absolute_coords.append((y, x))
        else:
            return None
    return tuple(absolute_coords)

def get_adjacent(rows, cols, shape, anchor_r, anchor_c):
    '''
    Given the dimensions of a puzzle (rows, cols),
    a canonical representation of a shape,
    and an anchor point (anchor_r, anchor_c),
    
    Tries to place the shape such that its "root" (first tuple element)
    is located at (anchor_r, anchor_c).
    
    Return None if the shape doesn't fit in the grid, and a list of
    coordinates of each of the shape's neighbors otherwise.
    '''
    neighbors = set()
    absolute_coords = place_shape_in_grid(rows, cols, shape, anchor_r, anchor_c)
    if absolute_coords == None:
        return None
    for y, x in absolute_coords:
        neighbors = neighbors.union(set(get_neighbors(rows, cols, y, x)))
    for y, x in absolute_coords:
        neighbors.discard((y, x))
    return neighbors
