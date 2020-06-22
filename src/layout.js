const klay = require('klayjs');
const assign = require('./assign');
const defaults = require('./defaults');

const klayNSLookup = {
  addUnnecessaryBendpoints:
    'de.cau.cs.kieler.klay.layered.unnecessaryBendpoints',
  alignment: 'de.cau.cs.kieler.alignment',
  aspectRatio: 'de.cau.cs.kieler.aspectRatio',
  borderSpacing: 'borderSpacing',
  compactComponents: 'de.cau.cs.kieler.klay.layered.components.compact',
  compactionStrategy:
    'de.cau.cs.kieler.klay.layered.nodeplace.compactionStrategy',
  contentAlignment: 'de.cau.cs.kieler.klay.layered.contentAlignment',
  crossingMinimization: 'de.cau.cs.kieler.klay.layered.crossMin',
  cycleBreaking: 'de.cau.cs.kieler.klay.layered.cycleBreaking',
  debugMode: 'de.cau.cs.kieler.debugMode',
  direction: 'de.cau.cs.kieler.direction',
  edgeLabelSideSelection:
    'de.cau.cs.kieler.klay.layered.edgeLabelSideSelection',
  // <broken> 'de.cau.cs.kieler.klay.layered.edgeNodeSpacingFactor': options.edgeNodeSpacingFactor,
  edgeRouting: 'de.cau.cs.kieler.edgeRouting',
  edgeSpacingFactor: 'de.cau.cs.kieler.klay.layered.edgeSpacingFactor',
  feedbackEdges: 'de.cau.cs.kieler.klay.layered.feedBackEdges',
  fixedAlignment: 'de.cau.cs.kieler.klay.layered.fixedAlignment',
  greedySwitchCrossingMinimization:
    'de.cau.cs.kieler.klay.layered.greedySwitch',
  hierarchyHandling: 'de.cau.cs.kieler.hierarchyHandling',
  inLayerSpacingFactor: 'de.cau.cs.kieler.klay.layered.inLayerSpacingFactor',
  interactiveReferencePoint:
    'de.cau.cs.kieler.klay.layered.interactiveReferencePoint',
  layerConstraint: 'de.cau.cs.kieler.klay.layered.layerConstraint',
  layoutHierarchy: 'de.cau.cs.kieler.layoutHierarchy',
  linearSegmentsDeflectionDampening:
    'de.cau.cs.kieler.klay.layered.linearSegmentsDeflectionDampening',
  mergeEdges: 'de.cau.cs.kieler.klay.layered.mergeEdges',
  mergeHierarchyCrossingEdges:
    'de.cau.cs.kieler.klay.layered.mergeHierarchyEdges',
  noLayout: 'de.cau.cs.kieler.noLayout',
  nodeLabelPlacement: 'de.cau.cs.kieler.nodeLabelPlacement',
  nodeLayering: 'de.cau.cs.kieler.klay.layered.nodeLayering',
  nodePlacement: 'de.cau.cs.kieler.klay.layered.nodePlace',
  portAlignment: 'de.cau.cs.kieler.portAlignment',
  portAlignmentEastern: 'de.cau.cs.kieler.portAlignment.east',
  portAlignmentNorth: 'de.cau.cs.kieler.portAlignment.north',
  portAlignmentSouth: 'de.cau.cs.kieler.portAlignment.south',
  portAlignmentWest: 'de.cau.cs.kieler.portAlignment.west',
  portConstraints: 'de.cau.cs.kieler.portConstraints',
  portLabelPlacement: 'de.cau.cs.kieler.portLabelPlacement',
  portOffset: 'de.cau.cs.kieler.offset',
  portSide: 'de.cau.cs.kieler.portSide',
  portSpacing: 'de.cau.cs.kieler.portSpacing',
  postCompaction: 'de.cau.cs.kieler.klay.layered.postCompaction',
  priority: 'de.cau.cs.kieler.priority',
  randomizationSeed: 'de.cau.cs.kieler.randomSeed',
  routeSelfLoopInside: 'de.cau.cs.kieler.selfLoopInside',
  separateConnectedComponents: 'de.cau.cs.kieler.separateConnComp',
  sizeConstraint: 'de.cau.cs.kieler.sizeConstraint',
  sizeOptions: 'de.cau.cs.kieler.sizeOptions',
  spacing: 'de.cau.cs.kieler.spacing',
  splineSelfLoopPlacement:
    'de.cau.cs.kieler.klay.layered.splines.selfLoopPlacement',
  thoroughness: 'de.cau.cs.kieler.klay.layered.thoroughness',
  wideNodesOnMultipleLayers:
    'de.cau.cs.kieler.klay.layered.wideNodesOnMultipleLayers',
};

const mapToKlayNS = function (klayOpts) {
  let keys = Object.keys(klayOpts);
  let ret = {};

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let nsKey = klayNSLookup[key];
    let val = klayOpts[key];

    ret[nsKey] = val;
  }

  return ret;
};

const klayOverrides = {
  interactiveReferencePoint: 'CENTER', // Determines which point of a node is considered by interactive layout phases.
};

const getPos = function (ele) {
  let parent = ele.parent();
  const elStatic = ele.scratch('static');
  let k = elStatic || ele.scratch('klay');
  let p = {
    x: k.x,
    y: k.y,
  };

  // if we had a static object, don't continue
  if (elStatic) {
    return p;
  }

  if (parent.nonempty()) {
    let kp = parent.scratch('static') || parent.scratch('klay');

    p.x += kp.x;
    p.y += kp.y;
  }

  return p;
};

const makeNode = function (node, options) {
  let dims = node.layoutDimensions(options);
  let padding = node.numericStyle('padding');

  let k = {
    _cyEle: node,
    id: node.id(),
    padding: {
      top: padding,
      left: padding,
      bottom: padding,
      right: padding,
    },
  };

  if (!node.isParent()) {
    k.width = dims.w;
    k.height = dims.h;
  }

  node.scratch('klay', k);

  return k;
};

const makeEdge = function (edge, options) {
  let k = {
    _cyEle: edge,
    id: edge.id(),
    source: edge.data('source'),
    target: edge.data('target'),
    properties: {},
  };

  let priority = options.priority(edge);

  if (priority != null) {
    k.properties.priority = priority;
  }

  edge.scratch('klay', k);

  return k;
};

const makeGraph = function (nodes, edges, options) {
  let klayNodes = [];
  let klayEdges = [];
  let klayEleLookup = {};
  let graph = {
    id: 'root',
    children: [],
    edges: [],
  };

  // map all nodes
  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    let k = makeNode(n, options);

    klayNodes.push(k);

    klayEleLookup[n.id()] = k;
  }

  // map all edges
  for (let i = 0; i < edges.length; i++) {
    let e = edges[i];
    let k = makeEdge(e, options);

    klayEdges.push(k);

    klayEleLookup[e.id()] = k;
  }

  // make hierarchy
  for (let i = 0; i < klayNodes.length; i++) {
    let k = klayNodes[i];
    let n = k._cyEle;

    if (!n.isChild()) {
      graph.children.push(k);
    } else {
      let parent = n.parent();
      let parentK = klayEleLookup[parent.id()];

      let children = (parentK.children = parentK.children || []);

      children.push(k);
    }
  }

  for (let i = 0; i < klayEdges.length; i++) {
    let k = klayEdges[i];
    let e = k._cyEle;
    let parentSrc = e.source().parent();
    let parentTgt = e.target().parent();

    // put all edges in the top level for now
    // TODO does this cause issues in certain edgecases?
    if (
      false &&
      parentSrc.nonempty() &&
      parentTgt.nonempty() &&
      parentSrc.same(parentTgt)
    ) {
      let kp = klayEleLookup[parentSrc.id()];

      kp.edges = kp.edges || [];

      kp.edges.push(k);
    } else {
      graph.edges.push(k);
    }
  }

  return graph;
};

function Layout(options) {
  let klayOptions = options.klay;

  this.options = assign({}, defaults, options);

  this.options.klay = assign({}, defaults.klay, klayOptions, klayOverrides);
}

const heightCollision = 150;
const widthCollision = 120;

const testCollision = (posX, posY, staticCoords) => {
  let collision = false;

  // use a for loop to break once we find it
  // staticCoords[i][0=x,1=y]
  for (let i = staticCoords.length - 1; i >= 0; i--) {
    if (
      Math.abs(staticCoords[i][1] - posY) < heightCollision &&
      Math.abs(staticCoords[i][0] - posX) < widthCollision
    ) {
      collision = true;
      break;
    }
  }

  return collision;
};

const safeNode = (node, staticCoords) => {
  const scratch = node.scratch('klay');
  let posX = scratch.x;
  let posY = scratch.y;
  let flipMovement = false;

  // while collision exists, keep moving flipping between horizontal and vertical until no collisions
  while (testCollision(posX, posY, staticCoords)) {
    if (flipMovement) {
      posX += widthCollision;
    } else {
      posY += heightCollision;
    }

    flipMovement = !flipMovement;
  }

  if (posX !== scratch.x || posY !== scratch.y) {
    staticCoords.push([posX, posY]);
    node.scratch('static', {
      x: posX,
      y: posY,
    });
  }
};

Layout.prototype.run = function () {
  let layout = this;
  let options = this.options;

  let eles = options.eles;
  let nodes = eles.nodes();
  let edges = eles.edges();

  let graph = makeGraph(nodes, edges, options);

  klay.layout({
    graph: graph,
    options: mapToKlayNS(options.klay),
    success: function () {},
    error: function (error) {
      throw error;
    },
  });

  const filteredNodes = nodes.filter((n) => !n.isParent());

  const staticCoords = [];
  const staticBox = {
    xMax: null,
    xMin: null,
    yMax: null,
    yMin: null,
  };

  const newNodes = filteredNodes.filter((n) => !n.scratch('static'));
  const staticNodes = filteredNodes.filter((n) => !!n.scratch('static'));

  const isGroupMove = newNodes.length > 1 && staticNodes.length > 1;

  // these nodes are not moved
  staticNodes.layoutPositions(layout, options, getPos).forEach((node) => {
    const { x, y } = node.scratch('static');

    if (isGroupMove) {
      if (staticBox.xMax === null) {
        staticBox.xMax = x;
        staticBox.xMin = x;
        staticBox.yMax = y;
        staticBox.yMin = y;
      } else {
        staticBox.xMax = Math.max(staticBox.xMax, x);
        staticBox.xMin = Math.min(staticBox.xMin, x);
        staticBox.yMax = Math.max(staticBox.yMax, y);
        staticBox.yMin = Math.min(staticBox.yMin, y);
      }
    } else {
      staticCoords.push([x, y]);
    }
  });

  if (isGroupMove) {
    // we need to move it as 1
    const newBox = {
      xMax: null,
      xMin: null,
      yMax: null,
      yMin: null,
    };

    newNodes.forEach((node) => {
      const scratch = node.scratch('klay');

      if (newBox.xMax === null) {
        newBox.xMax = scratch.x;
        newBox.xMin = scratch.x;
        newBox.yMax = scratch.y;
        newBox.yMin = scratch.y;
      } else {
        newBox.xMax = Math.max(newBox.xMax, scratch.x);
        newBox.xMin = Math.min(newBox.xMin, scratch.x);
        newBox.yMax = Math.max(newBox.yMax, scratch.y);
        newBox.yMin = Math.min(newBox.yMin, scratch.y);
      }
    });

    if (
      (newBox.xMax <= staticBox.xMax + 100 &&
        newBox.xMax >= staticBox.xMin - 100) ||
      (newBox.xMin <= staticBox.xMax + 100 &&
        newBox.xMin >= staticBox.xMin - 100) ||
      (newBox.yMax <= staticBox.yMax + 100 &&
        newBox.yMax >= staticBox.yMin - 100) ||
      (newBox.yMin <= staticBox.yMax + 100 &&
        newBox.yMin >= staticBox.yMin - 100)
    ) {
      // this box has collision, lets move the least amount
      // we need bottom-right movement
      // right = new x min -> static x max
      // bottom = new y max -> static y min
      const xDiff = Math.abs(newBox.xMin - staticBox.xMax);
      const yDiff = Math.abs(newBox.yMax - staticBox.yMin);

      if (xDiff < yDiff) {
        // this means Y is bigger, so move X
        newNodes.forEach((node) => {
          const scratch = node.scratch('klay');

          node.scratch('static', {
            x: scratch.x + xDiff + widthCollision,
            y: scratch.y,
          });
        });
      } else {
        // this means X is bigger, so move Y
        newNodes.forEach((node) => {
          const scratch = node.scratch('klay');

          node.scratch('static', {
            x: scratch.x,
            y: scratch.y + yDiff + heightCollision,
          });
        });
      }
    }
  } else {
    if (staticCoords.length) {
      newNodes.forEach((node) => safeNode(node, staticCoords));
    }
  }

  newNodes.layoutPositions(layout, options, getPos);

  return this;
};

Layout.prototype.stop = function () {
  return this; // chaining
};

Layout.prototype.destroy = function () {
  return this; // chaining
};

module.exports = Layout;
