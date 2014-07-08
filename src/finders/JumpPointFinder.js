/**
 * @author aniero / https://github.com/aniero
 */
var Heap       = require('heap');
var Util       = require('../core/Util');
var Heuristic  = require('../core/Heuristic');

/**
 * Path finder using the Jump Point Search algorithm
 * @param {object} opt
 * @param {function} opt.heuristic Heuristic function to estimate the distance
 *     (defaults to manhattan).
 */
function JumpPointFinder(opt) {
    opt = opt || {};
    this.heuristic = opt.heuristic || Heuristic.manhattan;
    this.trackJumpRecursion = opt.trackJumpRecursion || false;
}

/**
 * Find and return the path.
 * @return {Array.<[number, number]>} The path, including both start and
 *     end positions.
 */
JumpPointFinder.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var openList = this.openList = new Heap(function(nodeA, nodeB) {
            return nodeA.f - nodeB.f;
        }),
        startNode = this.startNode = grid.getNodeAt(startX, startY),
        endNode = this.endNode = grid.getNodeAt(endX, endY), node;

    this.grid = grid;


    // set the `g` and `f` value of the start node to be 0
    startNode.g = 0;
    startNode.f = 0;

    // push the start node into the open list
    openList.push(startNode);
    startNode.opened = true;

    // while the open list is not empty
    while (!openList.empty()) {
        // pop the position of node which has the minimum `f` value.
        node = openList.pop();
        node.closed = true;

        if (node === endNode) {
            return Util.expandPath(Util.backtrace(endNode));
        }

        this._identifySuccessors(node);
    }

    // fail to find the path
    return [];
};

/**
 * Identify successors for the given node. Runs a jump point search in the
 * direction of each available neighbor, adding any points found to the open
 * list.
 * @protected
 */
JumpPointFinder.prototype._identifySuccessors = function(node) {
    var grid = this.grid,
        heuristic = this.heuristic,
        openList = this.openList,
        endX = this.endNode.x,
        endY = this.endNode.y,
        endZ = this.endNode.z,
        neighbors, neighbor,
        jumpPoint, i, l,
        x = node.x, y = node.y, z = node.z,
        jx, jy, jz, dx, dy, dz, d, ng, jumpNode,
        abs = Math.abs, max = Math.max;

    neighbors = this._findNeighbors(node);
    for(i = 0, l = neighbors.length; i < l; ++i) {
        neighbor = neighbors[i];
        jumpPoint = this._jump(neighbor[0], neighbor[1], neighbor[2], x, y, z);
        if (jumpPoint) {

            jx = jumpPoint[0];
            jy = jumpPoint[1];
            jz = jumpPoint[2];
            jumpNode = grid.getNodeAt(jx, jy, jz);

            if (jumpNode.closed) {
                continue;
            }

            // include distance, as parent may not be immediately adjacent:
            d = Heuristic.euclidean(abs(jx - x), abs(jy - y), abs(jz - z));
            ng = node.g + d; // next `g` value

            if (!jumpNode.opened || ng < jumpNode.g) {
                jumpNode.g = ng;
                jumpNode.h = jumpNode.h || heuristic(abs(jx - endX), abs(jy - endY), abs(jz - endZ));
                jumpNode.f = jumpNode.g + jumpNode.h;
                jumpNode.parent = node;

                if (!jumpNode.opened) {
                    openList.push(jumpNode);
                    jumpNode.opened = true;
                } else {
                    openList.updateItem(jumpNode);
                }
            }
        }
    }
};

/**
 * Search recursively in the direction (parent -> child), stopping only when a
 * jump point is found.
 * @protected
 * @return {Array.<[number, number]>} The x, y coordinate of the jump point
 *     found, or null if not found
 */
JumpPointFinder.prototype._jump = function(x, y, z, px, py, pz) {
    var grid = this.grid,
        dx = x - px, dy = y - py, dz = z - pz;

    if (!grid.isWalkableAt(x, y, z)) {
        return null;
    }

    if(this.trackJumpRecursion === true) {
        grid.getNodeAt(x, y, z).tested = true;
    }

    if (grid.getNodeAt(x, y, z) === this.endNode) {
        return [x, y, z];
    }

    // check for forced neighbors
    // along the diagonal
    if (dx !== 0 && dy !== 0 && dz !== 0) {
        if ((grid.isWalkableAt(x - dx, y + dy, z - dz) && !grid.isWalkableAt(x - dx, y, z - dz)) ||
            (grid.isWalkableAt(x + dx, y - dy, z - dz) && !grid.isWalkableAt(x, y - dy, z - dz)) ||
            (grid.isWalkableAt(x - dx, y + dy, z + dz) && !grid.isWalkableAt(x - dx, y, z + dz)) ||
            (grid.isWalkableAt(x + dx, y - dy, z + dz) && !grid.isWalkableAt(x, y - dy, z + dz))) {
            return [x, y, z];
        }
    }
    // horizontally/vertically
    else {
        if( dx !== 0 ) { // moving along x
            if((grid.isWalkableAt(x + dx, y + 1, z + 1) && !grid.isWalkableAt(x, y + 1, z + 1)) ||
               (grid.isWalkableAt(x + dx, y - 1, z + 1) && !grid.isWalkableAt(x, y - 1, z + 1)) ||
               (grid.isWalkableAt(x + dx, y + 1, z - 1) && !grid.isWalkableAt(x, y + 1, z - 1)) ||
               (grid.isWalkableAt(x + dx, y - 1, z - 1) && !grid.isWalkableAt(x, y - 1, z - 1))) {
                return [x, y, z];
            }
        }
        else {
            if((grid.isWalkableAt(x + 1, y + dy, z + 1) && !grid.isWalkableAt(x + 1, y, z + 1)) ||
               (grid.isWalkableAt(x - 1, y + dy, z + 1) && !grid.isWalkableAt(x - 1, y, z + 1)) ||
               (grid.isWalkableAt(x + 1, y + dy, z - 1) && !grid.isWalkableAt(x + 1, y, z - 1)) ||
               (grid.isWalkableAt(x - 1, y + dy, z - 1) && !grid.isWalkableAt(x - 1, y, z - 1))) {
                return [x, y, z];
            }
        }
    }

    // when moving diagonally, must check for vertical/horizontal jump points
    if (dx !== 0 && dy !== 0 && dz !== 0) {
        if (this._jump(x + dx, y, z, x, y, z) || this._jump(x, y + dy, z, x, y, z) || this._jump(x, y, z + dz, x, y, z)) {
            return [x, y, z];
        }
    }

    // moving diagonally, must make sure one of the vertical/horizontal
    // neighbors is open to allow the path
    if (grid.isWalkableAt(x + dx, y, z) || grid.isWalkableAt(x, y + dy, z) || grid.isWalkableAt(x, y, z + dz)) {
        return this._jump(x + dx, y + dy, z + dz, x, y, z);
    } else {
        return null;
    }
};

/**
 * Find the neighbors for the given node. If the node has a parent,
 * prune the neighbors based on the jump point search algorithm, otherwise
 * return all available neighbors.
 * @return {Array.<[number, number]>} The neighbors found.
 */
JumpPointFinder.prototype._findNeighbors = function(node) {
    var parent = node.parent,
        x = node.x, y = node.y, z = node.z,
        grid = this.grid,
        px, py, pz, nx, ny, nz, dx, dy, nz,
        neighbors = [], neighborNodes, neighborNode, i, l;

    // directed pruning: can ignore most neighbors, unless forced.
    if (parent) {
        px = parent.x;
        py = parent.y;
        pz = parent.z;
        // get the normalized direction of travel
        dx = (x - px) / Math.max(Math.abs(x - px), 1);
        dy = (y - py) / Math.max(Math.abs(y - py), 1);
        dz = (z - pz) / Math.max(Math.abs(z - pz), 1);

        // search diagonally
        if (dx !== 0 && dy !== 0 && dz !== 0) {
            for(var cz = -1; cz < 2; cz++) {
                if (grid.isWalkableAt(x, y + dy, z + cz)) {
                    neighbors.push([x, y + dy, z + cz]);
                }
                if (grid.isWalkableAt(x + dx, y, z + cz)) {
                    neighbors.push([x + dx, y, z + cz]);
                }
                if (grid.isWalkableAt(x, y + dy, z + cz) || grid.isWalkableAt(x + dx, y, z + cz)) {
                    neighbors.push([x + dx, y + dy, z + cz]);
                }
                if (!grid.isWalkableAt(x - dx, y, z + cz) && grid.isWalkableAt(x, y + dy, z + cz)) {
                    neighbors.push([x - dx, y + dy, z + cz]);
                }
                if (!grid.isWalkableAt(x, y - dy, z + cz) && grid.isWalkableAt(x + dx, y, z + cz)) {
                    neighbors.push([x + dx, y - dy, z + cz]);
                }
            }
        }
        // search horizontally/vertically
        else {
            for(var cz = -1; cz < 2; cz++) {
                if(dx === 0) {
                    if (grid.isWalkableAt(x, y + dy, cz+z)) {
                        neighbors.push([x, y + dy, cz+z]);
                        if (!grid.isWalkableAt(x + 1, y, cz+z)) {
                            neighbors.push([x + 1, y + dy, cz+z]);
                        }
                        if (!grid.isWalkableAt(x - 1, y, cz+z)) {
                            neighbors.push([x - 1, y + dy, cz+z]);
                        }
                    }
                }
                else {
                    if (grid.isWalkableAt(x + dx, y, cz+z)) {
                        neighbors.push([x + dx, y, cz+z]);
                        if (!grid.isWalkableAt(x, y + 1, cz+z)) {
                            neighbors.push([x + dx, y + 1, cz+z]);
                        }
                        if (!grid.isWalkableAt(x, y - 1, cz+z)) {
                            neighbors.push([x + dx, y - 1, cz+z]);
                        }
                    }
                }
            }
        }
    }
    // return all neighbors
    else {
        neighborNodes = grid.getNeighbors(node, true);
        for (i = 0, l = neighborNodes.length; i < l; ++i) {
            neighborNode = neighborNodes[i];
            neighbors.push([neighborNode.x, neighborNode.y, neighborNode.z]);
        }
    }

    return neighbors;
};

module.exports = JumpPointFinder;
