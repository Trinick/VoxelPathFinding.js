/**
 * Backtrace according to the parent records and return the path.
 * (including both start and end nodes)
 * @param {Node} node End node
 * @return {Array.<Array.<number>>} the path
 */
function backtrace(node) {
    var path = [[node.x, node.y, node.z]];
    while (node.parent) {
        node = node.parent;
        path.push([node.x, node.y, node.z]);
    }
    return path.reverse();
}
exports.backtrace = backtrace;

/**
 * Backtrace from start and end node, and return the path.
 * (including both start and end nodes)
 * @param {Node}
 * @param {Node}
 */
function biBacktrace(nodeA, nodeB) {
    var pathA = backtrace(nodeA),
        pathB = backtrace(nodeB);
    return pathA.concat(pathB.reverse());
}
exports.biBacktrace = biBacktrace;

/**
 * Compute the length of the path.
 * @param {Array.<Array.<number>>} path The path
 * @return {number} The length of the path
 */
function pathLength(path) {
    var i, sum = 0, a, b, dx, dy, dz;
    for (i = 1; i < path.length; ++i) {
        a = path[i - 1];
        b = path[i];
        dx = a[0] - b[0];
        dy = a[1] - b[1];
        dz = a[2] - b[2];
        sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return sum;
}
exports.pathLength = pathLength;

/**
 * Given the start and end coordinates, return all the coordinates lying
 * on the line formed by these coordinates, based on Bresenham's algorithm.
 * http://en.wikipedia.org/wiki/Bresenham's_line_algorithm#Simplification
 * @param {number} x0 Start x coordinate
 * @param {number} y0 Start y coordinate
 * @param {number} x1 End x coordinate
 * @param {number} y1 End y coordinate
 * @return {Array.<Array.<number>>} The coordinates on the line
 */
function interpolate(x0, y0, z0, x1, y1, z1) {
    var abs = Math.abs,
        line = [],
        sx, sy, sz, dx, dy, err, e2;

    dx = abs(x1 - x0);
    dy = abs(y1 - y0);
    dz = abs(z1 - z0);

    sx = (x0 < x1) ? 1 : -1;
    sy = (y0 < y1) ? 1 : -1;
    sz = (z0 < z1) ? 1 : -1;

    err = dx - dy - sz;

    while (true) {
        line.push([x0, y0, z0]);

        if (x0 === x1 && y0 === y1 && z0 === z1) {
            break;
        }
        
        e2 = 2 * err;
        if (e2 > -dy) {
            err = err - dy;
            x0 = x0 + sx;
        }
        if (e2 < dx) {
            err = err + dx;
            y0 = y0 + sy;
        }
        if (e2 < dz) {
            err = err + dz;
            z0 = z0 + sz;
        }
    }

    return line;
}
exports.interpolate = interpolate;


/**
 * Given a compressed path, return a new path that has all the segments
 * in it interpolated.
 * @param {Array.<Array.<number>>} path The path
 * @return {Array.<Array.<number>>} expanded path
 */
function expandPath(path) {
    var expanded = [],
        len = path.length,
        coord0, coord1,
        interpolated,
        interpolatedLen,
        i, j;

    if (len < 2) {
        return expanded;
    }

    for (i = 0; i < len - 1; ++i) {
        coord0 = path[i];
        coord1 = path[i + 1];

        interpolated = interpolate(coord0[0], coord0[1], coord0[2], coord1[0], coord1[1], coord1[2]);
        interpolatedLen = interpolated.length;
        for (j = 0; j < interpolatedLen - 1; ++j) {
            expanded.push(interpolated[j]);
        }
    }
    expanded.push(path[len - 1]);

    return expanded;
}
exports.expandPath = expandPath;


/**
 * Smoothen the give path.
 * The original path will not be modified; a new path will be returned.
 * @param {PF.Grid} grid
 * @param {Array.<Array.<number>>} path The path
 */
function smoothenPath(grid, path) {
    var len = path.length,
        x0 = path[0][0],        // path start x
        y0 = path[0][1],        // path start y
        z0 = path[0][2],        // path start z
        x1 = path[len - 1][0],  // path end x
        y1 = path[len - 1][1],  // path end y
        z1 = path[len - 1][2],  // path end z
        sx, sy, sz,             // current start coordinate
        ex, ey, ez,             // current end coordinate
        lx, ly, lz,             // last valid end coordinate
        newPath,
        i, j, coord, line, testCoord, blocked;

    sx = x0;
    sy = y0;
    sz = z0;
    lx = path[1][0];
    ly = path[1][1];
    lz = path[1][2];
    newPath = [[sx, sy, sz]];

    for (i = 2; i < len; ++i) {
        coord = path[i];
        ex = coord[0];
        ey = coord[1];
        ez = coord[2];
        line = interpolate(sx, sy, sz, ex, ey, ez);

        blocked = false;
        for (j = 1; j < line.length; ++j) {
            testCoord = line[j];

            if (!grid.isWalkableAt(testCoord[0], testCoord[1], testCoord[2])) {
                blocked = true;
                newPath.push([lx, ly, lz]);
                sx = lx;
                sy = ly;
                sz = lz;
                break;
            }
        }
        if (!blocked) {
            lx = ex;
            ly = ey;
            lz = ez;
        }
    }
    newPath.push([x1, y1, z1]);

    return newPath;
}
exports.smoothenPath = smoothenPath;


/**
 * Compress a path, remove redundant nodes without altering the shape
 * The original path is not modified
 * @param {Array.<Array.<number>>} path The path
 * @return {Array.<Array.<number>>} The compressed path
 */
function compressPath(path) {

    // nothing to compress
    if(path.length < 3) {
        return path;
    }

    var compressed = [],
        sx = path[0][0], // start x
        sy = path[0][1], // start y
        sz = path[0][2], // start z
        px = path[1][0], // second point x
        py = path[1][1], // second point y
        pz = path[1][2], // second point z
        dx = px - sx, // direction between the two points
        dy = py - sy, // direction between the two points
        dz = pz - sz, // direction between the two points
        lx, ly, lz,
        ldx, ldy, ldz,
        sq, i;

    // normalize the direction
    sq = Math.sqrt(dx*dx + dy*dy + dz*dz);
    dx /= sq;
    dy /= sq;
    dz /= sq;

    // start the new path
    compressed.push([sx,sy,sz]);

    for(i = 2; i < path.length; i++) {

        // store the last point
        lx = px;
        ly = py;
        lz = pz;

        // store the last direction
        ldx = dx;
        ldy = dy;
        ldz = dz;

        // next point
        px = path[i][0];
        py = path[i][1];
        pz = path[i][2];

        // next direction
        dx = px - lx;
        dy = py - ly;
        dz = pz - lz;

        // normalize
        sq = Math.sqrt(dx*dx + dy*dy);
        dx /= sq;
        dy /= sq;
        dz /= sq;

        // if the direction has changed, store the point
        if ( dx !== ldx || dy !== ldy || dz !== ldz) {
            compressed.push([lx,ly,lz]);
        }
    }

    // store the last point
    compressed.push([px,py,pz]);

    return compressed;
}
exports.compressPath = compressPath;
