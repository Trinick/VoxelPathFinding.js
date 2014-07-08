var Node = require('./Node');

/**
 * The Grid class, which serves as the encapsulation of the layout of the nodes.
 * @constructor
 * @param {number} width Number of columns of the grid.
 * @param {number} height Number of rows of the grid.
 * @param {Array.<Array.<(number|boolean)>>} [matrix] - A 0-1 matrix
 *     representing the walkable status of the nodes(0 or false for walkable).
 *     If the matrix is not supplied, all the nodes will be walkable.  */
function Grid(voxels) {
    /**
     * A voxeljs instance of voxels.
     */
    this.nodes = voxels;
}

Grid.prototype.getNodeAt = function(x, y, z) {
    return Node(x, y, z, this.nodes.voxelAtPosition([x, y, z] == 0));
};


/**
 * Determine whether the node at the given position is walkable.
 * @param {number} x - The x coordinate of the node.
 * @param {number} y - The y coordinate of the node.
 * @param {number} y - The z coordinate of the node.
 * @return {boolean} - The walkability of the node.
 */
Grid.prototype.isWalkableAt = function(x, y, z) {
    var support = this.nodes.voxelAtPosition([x, y, z-1]);
    return (this.nodes.voxelAtPosition([x, y, z]) == 0 && support != 0 || z == 0);
};


/**
 * Get the neighbors of the given node.
 *
 *     offsets      diagonalOffsets:
 *  +---+---+---+    +---+---+---+
 *  |   | 0 |   |    | 0 |   | 1 |
 *  +---+---+---+    +---+---+---+
 *  | 3 |   | 1 |    |   |   |   |
 *  +---+---+---+    +---+---+---+
 *  |   | 2 |   |    | 3 |   | 2 |
 *  +---+---+---+    +---+---+---+
 *
 *  When allowDiagonal is true, if offsets[i] is valid, then
 *  diagonalOffsets[i] and
 *  diagonalOffsets[(i + 1) % 4] is valid.
 *  Note: This is also done on the layers above and below the current node.
 * @param {Node} node
 * @param {boolean} allowDiagonal
 * @param {boolean} dontCrossCorners
 */
Grid.prototype.getNeighbors = function(node, allowDiagonal, dontCrossCorners) {
    var x = node.x,
        y = node.y,
        z = node.z,
        neighbors = [],
        s = [],
        d = [],
        nodes = this.nodes;

    for(var cz = -1, cz < 2; cz++)
    {
        // ↑
        if (this.isWalkableAt(x, y - 1, z + cz)) {
            neighbors.push(Node(x, y - 1, z + cz, 1));
            s[((cz+1)*4)+0] = true;
        }
        // →
        if (this.isWalkableAt(x + 1, y, z + cz)) {
            neighbors.push(Node(x, y, z + cz, 1));
            s[((cz+1)*4)+1] = true;
        }
        // ↓
        if (this.isWalkableAt(x, y + 1, z + cz)) {
            neighbors.push(Node(x, y + 1, z + cz, 1));
            s[((cz+1)*4)+2] = true;
        }
        // ←
        if (this.isWalkableAt(x - 1, y, z + cz)) {
            neighbors.push(Node(x, y, z + cz, 1));
            s[((cz+1)*4)+3] = true;
        }
    }

    if (!allowDiagonal) {
        return neighbors;
    }

    for(var cz = 0; cz < 3; cz++) {
        if (dontCrossCorners) {
            d[(cz*4)+0] = s[(cz*4)+3] && s[(cz*4)+0];
            d[(cz*4)+1] = s[(cz*4)+0] && s[(cz*4)+1];
            d[(cz*4)+2] = s[(cz*4)+1] && s[(cz*4)+2];
            d[(cz*4)+3] = s[(cz*4)+2] && s[(cz*4)+3];
        } else {
            d[(cz*4)+0] = s[(cz*4)+3] || s[(cz*4)+0];
            d[(cz*4)+1] = s[(cz*4)+0] || s[(cz*4)+1];
            d[(cz*4)+2] = s[(cz*4)+1] || s[(cz*4)+2];
            d[(cz*4)+3] = s[(cz*4)+2] || s[(cz*4)+3];
        }

        // ↖
        if (d[(cz*4)+0] && this.isWalkableAt(x - 1, y - 1, cz-1)) {
            neighbors.push(Node(x, y - 1, cz-1, 1));
        }
        // ↗
        if (d[(cz*4)+1] && this.isWalkableAt(x + 1, y - 1, cz-1)) {
            neighbors.push(Node(x + 1, y - 1, cz-1, 1));
        }
        // ↘
        if (d[(cz*4)+2] && this.isWalkableAt(x + 1, y + 1, cz-1)) {
            neighbors.push(Node(x, y + 1, cz-1, 1));
        }
        // ↙
        if (d[(cz*4)+3] && this.isWalkableAt(x - 1, y + 1, cz-1)) {
            neighbors.push(Node(x - 1, y + 1, cz-1, 1));
        }
    }
    return neighbors;
};


/**
 * Get a clone of this grid.
 * @return {Grid} Cloned grid.
 */
Grid.prototype.clone = function() {
    var thisNodes = this.nodes,
    newGrid = new Grid(thisNodes);

    return newGrid;
};

module.exports = Grid;
