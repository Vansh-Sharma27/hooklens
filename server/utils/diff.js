const Diff = require('diff');

/**
 * Compare two captured requests
 * @param {Object} request1 - First request
 * @param {Object} request2 - Second request
 * @returns {Object} Diff result
 */
function diffRequests(request1, request2) {
  const result = {
    method: diffMethod(request1.method, request2.method),
    path: diffPath(request1.path, request2.path),
    headers: diffObjects(request1.headers, request2.headers),
    query: diffObjects(request1.query, request2.query),
    body: diffBodies(request1, request2),
    summary: {}
  };

  // Calculate summary
  result.summary = {
    methodChanged: result.method !== null,
    pathChanged: result.path.some(part => part.added || part.removed),
    headersChanged: result.headers.added.length + result.headers.removed.length + result.headers.changed.length > 0,
    queryChanged: result.query.added.length + result.query.removed.length + result.query.changed.length > 0,
    bodyChanged: result.body.some(part => part.added || part.removed)
  };

  return result;
}

function diffMethod(method1, method2) {
  if (method1 === method2) return null;
  return {
    old: method1,
    new: method2
  };
}

function diffPath(path1, path2) {
  if (path1 === path2) {
    return [{ value: path1, count: path1.length }];
  }
  return Diff.diffWords(path1, path2);
}

function diffObjects(obj1, obj2) {
  obj1 = obj1 || {};
  obj2 = obj2 || {};

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const hasKey1 = key in obj1;
    const hasKey2 = key in obj2;

    if (hasKey1 && hasKey2) {
      if (obj1[key] === obj2[key]) {
        unchanged.push({ key, value: obj1[key] });
      } else {
        changed.push({ 
          key, 
          oldValue: obj1[key], 
          newValue: obj2[key] 
        });
      }
    } else if (hasKey1) {
      removed.push({ key, value: obj1[key] });
    } else {
      added.push({ key, value: obj2[key] });
    }
  }

  return { added, removed, changed, unchanged };
}

function diffBodies(request1, request2) {
  const body1 = request1.body || '';
  const body2 = request2.body || '';

  // If both are JSON, do structured diff
  if (request1.isJson && request2.isJson && request1.parsedBody && request2.parsedBody) {
    try {
      return Diff.diffJson(request1.parsedBody, request2.parsedBody);
    } catch (error) {
      console.error('JSON diff failed, falling back to line diff:', error);
    }
  }

  // Otherwise, do line-by-line diff
  if (body1 === body2) {
    return [{ value: body1, count: body1.split('\n').length }];
  }
  
  return Diff.diffLines(body1, body2);
}

/**
 * Generate a summary of differences
 * @param {Object} request1 - First request
 * @param {Object} request2 - Second request
 * @returns {Object} Summary object
 */
function diffSummary(request1, request2) {
  const diff = diffRequests(request1, request2);
  
  return {
    id1: request1.id,
    id2: request2.id,
    timestamp1: request1.timestamp,
    timestamp2: request2.timestamp,
    methodChanged: diff.summary.methodChanged,
    pathChanged: diff.summary.pathChanged,
    headersChanged: diff.summary.headersChanged,
    queryChanged: diff.summary.queryChanged,
    bodyChanged: diff.summary.bodyChanged,
    hasChanges: diff.summary.methodChanged || 
                diff.summary.pathChanged || 
                diff.summary.headersChanged || 
                diff.summary.queryChanged || 
                diff.summary.bodyChanged
  };
}

module.exports = {
  diffRequests,
  diffSummary
};
