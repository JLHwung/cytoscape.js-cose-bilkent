(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.cytoscapeCoseBilkent = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var FDLayoutConstants = require('./FDLayoutConstants');

function CoSEConstants() {
}

//CoSEConstants inherits static props in FDLayoutConstants
for (var prop in FDLayoutConstants) {
  CoSEConstants[prop] = FDLayoutConstants[prop];
}

CoSEConstants.DEFAULT_USE_MULTI_LEVEL_SCALING = false;
CoSEConstants.DEFAULT_RADIAL_SEPARATION = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
CoSEConstants.DEFAULT_COMPONENT_SEPERATION = 60;
CoSEConstants.TILE = true;
CoSEConstants.TILING_PADDING_VERTICAL = 10;
CoSEConstants.TILING_PADDING_HORIZONTAL = 10;

module.exports = CoSEConstants;

},{"./FDLayoutConstants":10}],2:[function(require,module,exports){
var FDLayoutEdge = require('./FDLayoutEdge');

function CoSEEdge(source, target, vEdge) {
  FDLayoutEdge.call(this, source, target, vEdge);
}

CoSEEdge.prototype = Object.create(FDLayoutEdge.prototype);
for (var prop in FDLayoutEdge) {
  CoSEEdge[prop] = FDLayoutEdge[prop];
}

module.exports = CoSEEdge

},{"./FDLayoutEdge":11}],3:[function(require,module,exports){
var LGraph = require('./LGraph');

function CoSEGraph(parent, graphMgr, vGraph) {
  LGraph.call(this, parent, graphMgr, vGraph);
}

CoSEGraph.prototype = Object.create(LGraph.prototype);
for (var prop in LGraph) {
  CoSEGraph[prop] = LGraph[prop];
}

module.exports = CoSEGraph;

},{"./LGraph":19}],4:[function(require,module,exports){
var LGraphManager = require('./LGraphManager');

function CoSEGraphManager(layout) {
  LGraphManager.call(this, layout);
}

CoSEGraphManager.prototype = Object.create(LGraphManager.prototype);
for (var prop in LGraphManager) {
  CoSEGraphManager[prop] = LGraphManager[prop];
}

module.exports = CoSEGraphManager;

},{"./LGraphManager":20}],5:[function(require,module,exports){
var FDLayout = require('./FDLayout');
var CoSEGraphManager = require('./CoSEGraphManager');
var CoSEGraph = require('./CoSEGraph');
var CoSENode = require('./CoSENode');
var CoSEEdge = require('./CoSEEdge');
var CoSEConstants = require('./CoSEConstants');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');
var Point = require('./Point');
var PointD = require('./PointD');
var Layout = require('./Layout');
var Integer = require('./Integer');
var IGeometry = require('./IGeometry');
var LGraph = require('./LGraph');
var Transform = require('./Transform');

function CoSELayout() {
  FDLayout.call(this);
  
  this.toBeTiled = {}; // Memorize if a node is to be tiled or is tiled
}

CoSELayout.prototype = Object.create(FDLayout.prototype);

for (var prop in FDLayout) {
  CoSELayout[prop] = FDLayout[prop];
}

CoSELayout.prototype.newGraphManager = function () {
  var gm = new CoSEGraphManager(this);
  this.graphManager = gm;
  return gm;
};

CoSELayout.prototype.newGraph = function (vGraph) {
  return new CoSEGraph(null, this.graphManager, vGraph);
};

CoSELayout.prototype.newNode = function (vNode) {
  return new CoSENode(this.graphManager, vNode);
};

CoSELayout.prototype.newEdge = function (vEdge) {
  return new CoSEEdge(null, null, vEdge);
};

CoSELayout.prototype.initParameters = function () {
  FDLayout.prototype.initParameters.call(this, arguments);
  if (!this.isSubLayout) {
    if (CoSEConstants.DEFAULT_EDGE_LENGTH < 10)
    {
      this.idealEdgeLength = 10;
    }
    else
    {
      this.idealEdgeLength = CoSEConstants.DEFAULT_EDGE_LENGTH;
    }

    this.useSmartIdealEdgeLengthCalculation =
            CoSEConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
    this.springConstant =
            FDLayoutConstants.DEFAULT_SPRING_STRENGTH;
    this.repulsionConstant =
            FDLayoutConstants.DEFAULT_REPULSION_STRENGTH;
    this.gravityConstant =
            FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH;
    this.compoundGravityConstant =
            FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH;
    this.gravityRangeFactor =
            FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR;
    this.compoundGravityRangeFactor =
            FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR;
  }
};

CoSELayout.prototype.layout = function () {
  var createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  if (createBendsAsNeeded)
  {
    this.createBendpoints();
    this.graphManager.resetAllEdges();
  }

  this.level = 0;
  return this.classicLayout();
};

CoSELayout.prototype.classicLayout = function () {
  this.calculateNodesToApplyGravitationTo();
  this.graphManager.calcLowestCommonAncestors();
  this.graphManager.calcInclusionTreeDepths();
  this.graphManager.getRoot().calcEstimatedSize();
  this.calcIdealEdgeLengths();
  if (!this.incremental)
  {
    var forest = this.getFlatForest();

    // The graph associated with this layout is flat and a forest
    if (forest.length > 0)

    {
      this.positionNodesRadially(forest);
    }
    // The graph associated with this layout is not flat or a forest
    else
    {
      this.positionNodesRandomly();
    }
  }

  this.initSpringEmbedder();
  this.runSpringEmbedder();

  return true;
};

CoSELayout.prototype.tick = function() {
  this.totalIterations++;
  
  if (this.totalIterations === this.maxIterations) {
    return true; // Layout is not ended return true
  }
  
  if (this.totalIterations % FDLayoutConstants.CONVERGENCE_CHECK_PERIOD == 0)
  {
    if (this.isConverged())
    {
      return true; // Layout is not ended return true
    }

    this.coolingFactor = this.initialCoolingFactor *
            ((this.maxIterations - this.totalIterations) / this.maxIterations);
    this.animationPeriod = Math.ceil(this.initialAnimationPeriod * Math.sqrt(this.coolingFactor));

  }
  this.totalDisplacement = 0;
  this.graphManager.updateBounds();
  this.calcSpringForces();
  this.calcRepulsionForces();
  this.calcGravitationalForces();
  this.moveNodes();
  this.animate();
  
  return false; // Layout is not ended yet return false
};

CoSELayout.prototype.getPositionsData = function() {
  var allNodes = this.graphManager.getAllNodes();
  var pData = {};
  for (var i = 0; i < allNodes.length; i++) {
    var rect = allNodes[i].rect;
    var id = allNodes[i].id;
    pData[id] = {
      id: id,
      x: rect.getCenterX(),
      y: rect.getCenterY(),
      w: rect.width,
      h: rect.height
    };
  }
  
  return pData;
};

CoSELayout.prototype.runSpringEmbedder = function () {
  this.initialAnimationPeriod = 25;
  this.animationPeriod = this.initialAnimationPeriod;
  var layoutEnded = false;
  
  // If aminate option is 'during' signal that layout is supposed to start iterating
  if ( FDLayoutConstants.ANIMATE === 'during' ) {
    this.emit('layoutstarted');
  }
  else {
    // If aminate option is 'during' tick() function will be called on index.js
    while (!layoutEnded) {
      layoutEnded = this.tick();
    }

    this.graphManager.updateBounds();
  }
};

CoSELayout.prototype.calculateNodesToApplyGravitationTo = function () {
  var nodeList = [];
  var graph;

  var graphs = this.graphManager.getGraphs();
  var size = graphs.length;
  var i;
  for (i = 0; i < size; i++)
  {
    graph = graphs[i];

    graph.updateConnected();

    if (!graph.isConnected)
    {
      nodeList = nodeList.concat(graph.getNodes());
    }
  }

  this.graphManager.setAllNodesToApplyGravitation(nodeList);
};

CoSELayout.prototype.createBendpoints = function () {
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  var visited = new HashSet();
  var i;
  for (i = 0; i < edges.length; i++)
  {
    var edge = edges[i];

    if (!visited.contains(edge))
    {
      var source = edge.getSource();
      var target = edge.getTarget();

      if (source == target)
      {
        edge.getBendpoints().push(new PointD());
        edge.getBendpoints().push(new PointD());
        this.createDummyNodesForBendpoints(edge);
        visited.add(edge);
      }
      else
      {
        var edgeList = [];

        edgeList = edgeList.concat(source.getEdgeListToNode(target));
        edgeList = edgeList.concat(target.getEdgeListToNode(source));

        if (!visited.contains(edgeList[0]))
        {
          if (edgeList.length > 1)
          {
            var k;
            for (k = 0; k < edgeList.length; k++)
            {
              var multiEdge = edgeList[k];
              multiEdge.getBendpoints().push(new PointD());
              this.createDummyNodesForBendpoints(multiEdge);
            }
          }
          visited.addAll(list);
        }
      }
    }

    if (visited.size() == edges.length)
    {
      break;
    }
  }
};

CoSELayout.prototype.positionNodesRadially = function (forest) {
  // We tile the trees to a grid row by row; first tree starts at (0,0)
  var currentStartingPoint = new Point(0, 0);
  var numberOfColumns = Math.ceil(Math.sqrt(forest.length));
  var height = 0;
  var currentY = 0;
  var currentX = 0;
  var point = new PointD(0, 0);

  for (var i = 0; i < forest.length; i++)
  {
    if (i % numberOfColumns == 0)
    {
      // Start of a new row, make the x coordinate 0, increment the
      // y coordinate with the max height of the previous row
      currentX = 0;
      currentY = height;

      if (i != 0)
      {
        currentY += CoSEConstants.DEFAULT_COMPONENT_SEPERATION;
      }

      height = 0;
    }

    var tree = forest[i];

    // Find the center of the tree
    var centerNode = Layout.findCenterOfTree(tree);

    // Set the staring point of the next tree
    currentStartingPoint.x = currentX;
    currentStartingPoint.y = currentY;

    // Do a radial layout starting with the center
    point =
            CoSELayout.radialLayout(tree, centerNode, currentStartingPoint);

    if (point.y > height)
    {
      height = Math.floor(point.y);
    }

    currentX = Math.floor(point.x + CoSEConstants.DEFAULT_COMPONENT_SEPERATION);
  }

  this.transform(
          new PointD(LayoutConstants.WORLD_CENTER_X - point.x / 2,
                  LayoutConstants.WORLD_CENTER_Y - point.y / 2));
};

CoSELayout.radialLayout = function (tree, centerNode, startingPoint) {
  var radialSep = Math.max(this.maxDiagonalInTree(tree),
          CoSEConstants.DEFAULT_RADIAL_SEPARATION);
  CoSELayout.branchRadialLayout(centerNode, null, 0, 359, 0, radialSep);
  var bounds = LGraph.calculateBounds(tree);

  var transform = new Transform();
  transform.setDeviceOrgX(bounds.getMinX());
  transform.setDeviceOrgY(bounds.getMinY());
  transform.setWorldOrgX(startingPoint.x);
  transform.setWorldOrgY(startingPoint.y);

  for (var i = 0; i < tree.length; i++)
  {
    var node = tree[i];
    node.transform(transform);
  }

  var bottomRight =
          new PointD(bounds.getMaxX(), bounds.getMaxY());

  return transform.inverseTransformPoint(bottomRight);
};

CoSELayout.branchRadialLayout = function (node, parentOfNode, startAngle, endAngle, distance, radialSeparation) {
  // First, position this node by finding its angle.
  var halfInterval = ((endAngle - startAngle) + 1) / 2;

  if (halfInterval < 0)
  {
    halfInterval += 180;
  }

  var nodeAngle = (halfInterval + startAngle) % 360;
  var teta = (nodeAngle * IGeometry.TWO_PI) / 360;

  // Make polar to java cordinate conversion.
  var cos_teta = Math.cos(teta);
  var x_ = distance * Math.cos(teta);
  var y_ = distance * Math.sin(teta);

  node.setCenter(x_, y_);

  // Traverse all neighbors of this node and recursively call this
  // function.
  var neighborEdges = [];
  neighborEdges = neighborEdges.concat(node.getEdges());
  var childCount = neighborEdges.length;

  if (parentOfNode != null)
  {
    childCount--;
  }

  var branchCount = 0;

  var incEdgesCount = neighborEdges.length;
  var startIndex;

  var edges = node.getEdgesBetween(parentOfNode);

  // If there are multiple edges, prune them until there remains only one
  // edge.
  while (edges.length > 1)
  {
    //neighborEdges.remove(edges.remove(0));
    var temp = edges[0];
    edges.splice(0, 1);
    var index = neighborEdges.indexOf(temp);
    if (index >= 0) {
      neighborEdges.splice(index, 1);
    }
    incEdgesCount--;
    childCount--;
  }

  if (parentOfNode != null)
  {
    //assert edges.length == 1;
    startIndex = (neighborEdges.indexOf(edges[0]) + 1) % incEdgesCount;
  }
  else
  {
    startIndex = 0;
  }

  var stepAngle = Math.abs(endAngle - startAngle) / childCount;

  for (var i = startIndex;
          branchCount != childCount;
          i = (++i) % incEdgesCount)
  {
    var currentNeighbor =
            neighborEdges[i].getOtherEnd(node);

    // Don't back traverse to root node in current tree.
    if (currentNeighbor == parentOfNode)
    {
      continue;
    }

    var childStartAngle =
            (startAngle + branchCount * stepAngle) % 360;
    var childEndAngle = (childStartAngle + stepAngle) % 360;

    CoSELayout.branchRadialLayout(currentNeighbor,
            node,
            childStartAngle, childEndAngle,
            distance + radialSeparation, radialSeparation);

    branchCount++;
  }
};

CoSELayout.maxDiagonalInTree = function (tree) {
  var maxDiagonal = Integer.MIN_VALUE;

  for (var i = 0; i < tree.length; i++)
  {
    var node = tree[i];
    var diagonal = node.getDiagonal();

    if (diagonal > maxDiagonal)
    {
      maxDiagonal = diagonal;
    }
  }

  return maxDiagonal;
};

CoSELayout.prototype.calcRepulsionRange = function () {
  // formula is 2 x (level + 1) x idealEdgeLength
  return (2 * (this.level + 1) * this.idealEdgeLength);
};

// Tiling methods

// Group zero degree members whose parents are not to be tiled, create dummy parents where needed and fill memberGroups by their dummp parent id's
CoSELayout.prototype.groupZeroDegreeMembers = function () {
  var self = this;
  // array of [parent_id x oneDegreeNode_id]
  var tempMemberGroups = {}; // A temporary map of parent node and its zero degree members
  this.memberGroups = {}; // A map of dummy parent node and its zero degree members whose parents are not to be tiled
  this.idToDummyNode = {}; // A map of id to dummy node 
  
  var zeroDegree = []; // List of zero degree nodes whose parents are not to be tiled
  var allNodes = this.graphManager.getAllNodes();

  // Fill zero degree list
  for (var i = 0; i < allNodes.length; i++) {
    var node = allNodes[i];
    var parent = node.getParent();
    // If a node has zero degree and its parent is not to be tiled if exists add that node to zeroDegres list
    if (this.getNodeDegreeWithChildren(node) === 0 && ( parent.id == undefined || !this.getToBeTiled(parent) ) ) {
      zeroDegree.push(node);
    }
  }

  // Create a map of parent node and its zero degree members
  for (var i = 0; i < zeroDegree.length; i++)
  {
    var node = zeroDegree[i]; // Zero degree node itself
    var p_id = node.getParent().id; // Parent id

    if (typeof tempMemberGroups[p_id] === "undefined")
      tempMemberGroups[p_id] = [];

    tempMemberGroups[p_id] = tempMemberGroups[p_id].concat(node); // Push node to the list belongs to its parent in tempMemberGroups
  }

  // If there are at least two nodes at a level, create a dummy compound for them
  Object.keys(tempMemberGroups).forEach(function(p_id) {
    if (tempMemberGroups[p_id].length > 1) {
      var dummyCompoundId = "DummyCompound_" + p_id; // The id of dummy compound which will be created soon
      self.memberGroups[dummyCompoundId] = tempMemberGroups[p_id]; // Add dummy compound to memberGroups

      var parent = tempMemberGroups[p_id][0].getParent(); // The parent of zero degree nodes will be the parent of new dummy compound

      // Create a dummy compound with calculated id
      var dummyCompound = new CoSENode(self.graphManager);
      dummyCompound.id = dummyCompoundId;
      dummyCompound.paddingLeft = parent.paddingLeft || 0;
      dummyCompound.paddingRight = parent.paddingRight || 0;
      dummyCompound.paddingBottom = parent.paddingBottom || 0;
      dummyCompound.paddingTop = parent.paddingTop || 0;
      
      self.idToDummyNode[dummyCompoundId] = dummyCompound;
      
      var dummyParentGraph = self.getGraphManager().add(self.newGraph(), dummyCompound);
      var parentGraph = parent.getChild();

      // Add dummy compound to parent the graph
      parentGraph.add(dummyCompound);

      // For each zero degree node in this level remove it from its parent graph and add it to the graph of dummy parent
      for (var i = 0; i < tempMemberGroups[p_id].length; i++) {
        var node = tempMemberGroups[p_id][i];
        
        parentGraph.remove(node);
        dummyParentGraph.add(node);
      }
    }
  });
};

CoSELayout.prototype.clearCompounds = function () {
  var childGraphMap = {};
  var idToNode = {};

  // Get compound ordering by finding the inner one first
  this.performDFSOnCompounds();

  for (var i = 0; i < this.compoundOrder.length; i++) {
    
    idToNode[this.compoundOrder[i].id] = this.compoundOrder[i];
    childGraphMap[this.compoundOrder[i].id] = [].concat(this.compoundOrder[i].getChild().getNodes());

    // Remove children of compounds
    this.graphManager.remove(this.compoundOrder[i].getChild());
    this.compoundOrder[i].child = null;
  }
  
  this.graphManager.resetAllNodes();
  
  // Tile the removed children
  this.tileCompoundMembers(childGraphMap, idToNode);
};

CoSELayout.prototype.clearZeroDegreeMembers = function () {
  var self = this;
  var tiledZeroDegreePack = this.tiledZeroDegreePack = [];

  Object.keys(this.memberGroups).forEach(function(id) {
    var compoundNode = self.idToDummyNode[id]; // Get the dummy compound

    tiledZeroDegreePack[id] = self.tileNodes(self.memberGroups[id], compoundNode.paddingLeft + compoundNode.paddingRight);

    // Set the width and height of the dummy compound as calculated
    compoundNode.rect.width = tiledZeroDegreePack[id].width;
    compoundNode.rect.height = tiledZeroDegreePack[id].height;
  });
};

CoSELayout.prototype.repopulateCompounds = function () {
  for (var i = this.compoundOrder.length - 1; i >= 0; i--) {
    var lCompoundNode = this.compoundOrder[i];
    var id = lCompoundNode.id;
    var horizontalMargin = lCompoundNode.paddingLeft;
    var verticalMargin = lCompoundNode.paddingTop;

    this.adjustLocations(this.tiledMemberPack[id], lCompoundNode.rect.x, lCompoundNode.rect.y, horizontalMargin, verticalMargin);
  }
};

CoSELayout.prototype.repopulateZeroDegreeMembers = function () {
  var self = this;
  var tiledPack = this.tiledZeroDegreePack;
  
  Object.keys(tiledPack).forEach(function(id) {
    var compoundNode = self.idToDummyNode[id]; // Get the dummy compound by its id
    var horizontalMargin = compoundNode.paddingLeft;
    var verticalMargin = compoundNode.paddingTop;

    // Adjust the positions of nodes wrt its compound
    self.adjustLocations(tiledPack[id], compoundNode.rect.x, compoundNode.rect.y, horizontalMargin, verticalMargin);
  });
};

CoSELayout.prototype.getToBeTiled = function (node) {
  var id = node.id;
  //firstly check the previous results
  if (this.toBeTiled[id] != null) {
    return this.toBeTiled[id];
  }

  //only compound nodes are to be tiled
  var childGraph = node.getChild();
  if (childGraph == null) {
    this.toBeTiled[id] = false;
    return false;
  }

  var children = childGraph.getNodes(); // Get the children nodes

  //a compound node is not to be tiled if all of its compound children are not to be tiled
  for (var i = 0; i < children.length; i++) {
    var theChild = children[i];

    if (this.getNodeDegree(theChild) > 0) {
      this.toBeTiled[id] = false;
      return false;
    }

    //pass the children not having the compound structure
    if (theChild.getChild() == null) {
      this.toBeTiled[theChild.id] = false;
      continue;
    }

    if (!this.getToBeTiled(theChild)) {
      this.toBeTiled[id] = false;
      return false;
    }
  }
  this.toBeTiled[id] = true;
  return true;
};

// Get degree of a node depending of its edges and independent of its children
CoSELayout.prototype.getNodeDegree = function (node) {
  var id = node.id;
  var edges = node.getEdges();
  var degree = 0;
  
  // For the edges connected
  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    if (edge.getSource().id !== edge.getTarget().id) {
      degree = degree + 1;
    }
  }
  return degree;
};

// Get degree of a node with its children
CoSELayout.prototype.getNodeDegreeWithChildren = function (node) {
  var degree = this.getNodeDegree(node);
  if (node.getChild() == null) {
    return degree;
  }
  var children = node.getChild().getNodes();
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    degree += this.getNodeDegreeWithChildren(child);
  }
  return degree;
};

CoSELayout.prototype.performDFSOnCompounds = function () {
  this.compoundOrder = [];
  this.fillCompexOrderByDFS(this.graphManager.getRoot().getNodes());
};

CoSELayout.prototype.fillCompexOrderByDFS = function (children) {
  for (var i = 0; i < children.length; i++) {
    var child = children[i];
    if (child.getChild() != null) {
      this.fillCompexOrderByDFS(child.getChild().getNodes());
    }
    if (this.getToBeTiled(child)) {
      this.compoundOrder.push(child);
    }
  }
};

/**
* This method places each zero degree member wrt given (x,y) coordinates (top left).
*/
CoSELayout.prototype.adjustLocations = function (organization, x, y, compoundHorizontalMargin, compoundVerticalMargin) {
  x += compoundHorizontalMargin;
  y += compoundVerticalMargin;

  var left = x;

  for (var i = 0; i < organization.rows.length; i++) {
    var row = organization.rows[i];
    x = left;
    var maxHeight = 0;

    for (var j = 0; j < row.length; j++) {
      var lnode = row[j];

      lnode.rect.x = x;// + lnode.rect.width / 2;
      lnode.rect.y = y;// + lnode.rect.height / 2;

      x += lnode.rect.width + organization.horizontalPadding;

      if (lnode.rect.height > maxHeight)
        maxHeight = lnode.rect.height;
    }

    y += maxHeight + organization.verticalPadding;
  }
};

CoSELayout.prototype.tileCompoundMembers = function (childGraphMap, idToNode) {
  var self = this;
  this.tiledMemberPack = [];

  Object.keys(childGraphMap).forEach(function(id) {
    // Get the compound node
    var compoundNode = idToNode[id];

    self.tiledMemberPack[id] = self.tileNodes(childGraphMap[id], compoundNode.paddingLeft + compoundNode.paddingRight);

    compoundNode.rect.width = self.tiledMemberPack[id].width + 20;
    compoundNode.rect.height = self.tiledMemberPack[id].height + 20;
  });
};

CoSELayout.prototype.tileNodes = function (nodes, minWidth) {
  var verticalPadding = CoSEConstants.TILING_PADDING_VERTICAL;
  var horizontalPadding = CoSEConstants.TILING_PADDING_HORIZONTAL;
  var organization = {
    rows: [],
    rowWidth: [],
    rowHeight: [],
    width: 20,
    height: 20,
    verticalPadding: verticalPadding,
    horizontalPadding: horizontalPadding
  };

  // Sort the nodes in ascending order of their areas
  nodes.sort(function (n1, n2) {
    if (n1.rect.width * n1.rect.height > n2.rect.width * n2.rect.height)
      return -1;
    if (n1.rect.width * n1.rect.height < n2.rect.width * n2.rect.height)
      return 1;
    return 0;
  });

  // Create the organization -> tile members
  for (var i = 0; i < nodes.length; i++) {
    var lNode = nodes[i];
    
    if (organization.rows.length == 0) {
      this.insertNodeToRow(organization, lNode, 0, minWidth);
    }
    else if (this.canAddHorizontal(organization, lNode.rect.width, lNode.rect.height)) {
      this.insertNodeToRow(organization, lNode, this.getShortestRowIndex(organization), minWidth);
    }
    else {
      this.insertNodeToRow(organization, lNode, organization.rows.length, minWidth);
    }

    this.shiftToLastRow(organization);
  }

  return organization;
};

CoSELayout.prototype.insertNodeToRow = function (organization, node, rowIndex, minWidth) {
  var minCompoundSize = minWidth;

  // Add new row if needed
  if (rowIndex == organization.rows.length) {
    var secondDimension = [];

    organization.rows.push(secondDimension);
    organization.rowWidth.push(minCompoundSize);
    organization.rowHeight.push(0);
  }

  // Update row width
  var w = organization.rowWidth[rowIndex] + node.rect.width;

  if (organization.rows[rowIndex].length > 0) {
    w += organization.horizontalPadding;
  }

  organization.rowWidth[rowIndex] = w;
  // Update compound width
  if (organization.width < w) {
    organization.width = w;
  }

  // Update height
  var h = node.rect.height;
  if (rowIndex > 0)
    h += organization.verticalPadding;

  var extraHeight = 0;
  if (h > organization.rowHeight[rowIndex]) {
    extraHeight = organization.rowHeight[rowIndex];
    organization.rowHeight[rowIndex] = h;
    extraHeight = organization.rowHeight[rowIndex] - extraHeight;
  }

  organization.height += extraHeight;

  // Insert node
  organization.rows[rowIndex].push(node);
};

//Scans the rows of an organization and returns the one with the min width
CoSELayout.prototype.getShortestRowIndex = function (organization) {
  var r = -1;
  var min = Number.MAX_VALUE;

  for (var i = 0; i < organization.rows.length; i++) {
    if (organization.rowWidth[i] < min) {
      r = i;
      min = organization.rowWidth[i];
    }
  }
  return r;
};

//Scans the rows of an organization and returns the one with the max width
CoSELayout.prototype.getLongestRowIndex = function (organization) {
  var r = -1;
  var max = Number.MIN_VALUE;

  for (var i = 0; i < organization.rows.length; i++) {

    if (organization.rowWidth[i] > max) {
      r = i;
      max = organization.rowWidth[i];
    }
  }

  return r;
};

/**
* This method checks whether adding extra width to the organization violates
* the aspect ratio(1) or not.
*/
CoSELayout.prototype.canAddHorizontal = function (organization, extraWidth, extraHeight) {

  var sri = this.getShortestRowIndex(organization);

  if (sri < 0) {
    return true;
  }

  var min = organization.rowWidth[sri];

  if (min + organization.horizontalPadding + extraWidth <= organization.width)
    return true;

  var hDiff = 0;

  // Adding to an existing row
  if (organization.rowHeight[sri] < extraHeight) {
    if (sri > 0)
      hDiff = extraHeight + organization.verticalPadding - organization.rowHeight[sri];
  }

  var add_to_row_ratio;
  if (organization.width - min >= extraWidth + organization.horizontalPadding) {
    add_to_row_ratio = (organization.height + hDiff) / (min + extraWidth + organization.horizontalPadding);
  } else {
    add_to_row_ratio = (organization.height + hDiff) / organization.width;
  }

  // Adding a new row for this node
  hDiff = extraHeight + organization.verticalPadding;
  var add_new_row_ratio;
  if (organization.width < extraWidth) {
    add_new_row_ratio = (organization.height + hDiff) / extraWidth;
  } else {
    add_new_row_ratio = (organization.height + hDiff) / organization.width;
  }

  if (add_new_row_ratio < 1)
    add_new_row_ratio = 1 / add_new_row_ratio;

  if (add_to_row_ratio < 1)
    add_to_row_ratio = 1 / add_to_row_ratio;

  return add_to_row_ratio < add_new_row_ratio;
};

//If moving the last node from the longest row and adding it to the last
//row makes the bounding box smaller, do it.
CoSELayout.prototype.shiftToLastRow = function (organization) {
  var longest = this.getLongestRowIndex(organization);
  var last = organization.rowWidth.length - 1;
  var row = organization.rows[longest];
  var node = row[row.length - 1];

  var diff = node.width + organization.horizontalPadding;

  // Check if there is enough space on the last row
  if (organization.width - organization.rowWidth[last] > diff && longest != last) {
    // Remove the last element of the longest row
    row.splice(-1, 1);

    // Push it to the last row
    organization.rows[last].push(node);

    organization.rowWidth[longest] = organization.rowWidth[longest] - diff;
    organization.rowWidth[last] = organization.rowWidth[last] + diff;
    organization.width = organization.rowWidth[instance.getLongestRowIndex(organization)];

    // Update heights of the organization
    var maxHeight = Number.MIN_VALUE;
    for (var i = 0; i < row.length; i++) {
      if (row[i].height > maxHeight)
        maxHeight = row[i].height;
    }
    if (longest > 0)
      maxHeight += organization.verticalPadding;

    var prevTotal = organization.rowHeight[longest] + organization.rowHeight[last];

    organization.rowHeight[longest] = maxHeight;
    if (organization.rowHeight[last] < node.height + organization.verticalPadding)
      organization.rowHeight[last] = node.height + organization.verticalPadding;

    var finalTotal = organization.rowHeight[longest] + organization.rowHeight[last];
    organization.height += (finalTotal - prevTotal);

    this.shiftToLastRow(organization);
  }
};

CoSELayout.prototype.tilingPreLayout = function() {
  if (CoSEConstants.TILE) {
    // Find zero degree nodes and create a compound for each level
    this.groupZeroDegreeMembers();
    // Tile and clear children of each compound
    this.clearCompounds();
    // Separately tile and clear zero degree nodes for each level
    this.clearZeroDegreeMembers();
  }
};

CoSELayout.prototype.tilingPostLayout = function() {
  if (CoSEConstants.TILE) {
    this.repopulateZeroDegreeMembers();
    this.repopulateCompounds();
  }
};

module.exports = CoSELayout;

},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSENode":6,"./FDLayout":9,"./FDLayoutConstants":10,"./IGeometry":15,"./Integer":17,"./LGraph":19,"./Layout":23,"./LayoutConstants":24,"./Point":25,"./PointD":26,"./Transform":29}],6:[function(require,module,exports){
var FDLayoutNode = require('./FDLayoutNode');
var IMath = require('./IMath');

function CoSENode(gm, loc, size, vNode) {
  FDLayoutNode.call(this, gm, loc, size, vNode);
}


CoSENode.prototype = Object.create(FDLayoutNode.prototype);
for (var prop in FDLayoutNode) {
  CoSENode[prop] = FDLayoutNode[prop];
}

CoSENode.prototype.move = function ()
{
  var layout = this.graphManager.getLayout();
  this.displacementX = layout.coolingFactor *
          (this.springForceX + this.repulsionForceX + this.gravitationForceX);
  this.displacementY = layout.coolingFactor *
          (this.springForceY + this.repulsionForceY + this.gravitationForceY);


  if (Math.abs(this.displacementX) > layout.coolingFactor * layout.maxNodeDisplacement)
  {
    this.displacementX = layout.coolingFactor * layout.maxNodeDisplacement *
            IMath.sign(this.displacementX);
  }

  if (Math.abs(this.displacementY) > layout.coolingFactor * layout.maxNodeDisplacement)
  {
    this.displacementY = layout.coolingFactor * layout.maxNodeDisplacement *
            IMath.sign(this.displacementY);
  }

  // a simple node, just move it
  if (this.child == null)
  {
    this.moveBy(this.displacementX, this.displacementY);
  }
  // an empty compound node, again just move it
  else if (this.child.getNodes().length == 0)
  {
    this.moveBy(this.displacementX, this.displacementY);
  }
  // non-empty compound node, propogate movement to children as well
  else
  {
    this.propogateDisplacementToChildren(this.displacementX,
            this.displacementY);
  }

  layout.totalDisplacement +=
          Math.abs(this.displacementX) + Math.abs(this.displacementY);

  this.springForceX = 0;
  this.springForceY = 0;
  this.repulsionForceX = 0;
  this.repulsionForceY = 0;
  this.gravitationForceX = 0;
  this.gravitationForceY = 0;
  this.displacementX = 0;
  this.displacementY = 0;
};

CoSENode.prototype.propogateDisplacementToChildren = function (dX, dY)
{
  var nodes = this.getChild().getNodes();
  var node;
  for (var i = 0; i < nodes.length; i++)
  {
    node = nodes[i];
    if (node.getChild() == null)
    {
      node.moveBy(dX, dY);
      node.displacementX += dX;
      node.displacementY += dY;
    }
    else
    {
      node.propogateDisplacementToChildren(dX, dY);
    }
  }
};

CoSENode.prototype.setPred1 = function (pred1)
{
  this.pred1 = pred1;
};

CoSENode.prototype.getPred1 = function ()
{
  return pred1;
};

CoSENode.prototype.getPred2 = function ()
{
  return pred2;
};

CoSENode.prototype.setNext = function (next)
{
  this.next = next;
};

CoSENode.prototype.getNext = function ()
{
  return next;
};

CoSENode.prototype.setProcessed = function (processed)
{
  this.processed = processed;
};

CoSENode.prototype.isProcessed = function ()
{
  return processed;
};

module.exports = CoSENode;

},{"./FDLayoutNode":12,"./IMath":16}],7:[function(require,module,exports){
function DimensionD(width, height) {
  this.width = 0;
  this.height = 0;
  if (width !== null && height !== null) {
    this.height = height;
    this.width = width;
  }
}

DimensionD.prototype.getWidth = function ()
{
  return this.width;
};

DimensionD.prototype.setWidth = function (width)
{
  this.width = width;
};

DimensionD.prototype.getHeight = function ()
{
  return this.height;
};

DimensionD.prototype.setHeight = function (height)
{
  this.height = height;
};

module.exports = DimensionD;

},{}],8:[function(require,module,exports){
function Emitter(){
  this.listeners = [];
}

var p = Emitter.prototype;

p.addListener = function( event, callback ){
  this.listeners.push({
    event: event,
    callback: callback
  });
};

p.removeListener = function( event, callback ){
  for( var i = this.listeners.length; i >= 0; i-- ){
    var l = this.listeners[i];

    if( l.event === event && l.callback === callback ){
      this.listeners.splice( i, 1 );
    }
  }
};

p.emit = function( event, data ){
  for( var i = 0; i < this.listeners.length; i++ ){
    var l = this.listeners[i];

    if( event === l.event ){
      l.callback( data );
    }
  }
};

module.exports = Emitter;

},{}],9:[function(require,module,exports){
var Layout = require('./Layout');
var FDLayoutConstants = require('./FDLayoutConstants');
var LayoutConstants = require('./LayoutConstants');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');

function FDLayout() {
  Layout.call(this);

  this.useSmartIdealEdgeLengthCalculation = FDLayoutConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION;
  this.idealEdgeLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
  this.springConstant = FDLayoutConstants.DEFAULT_SPRING_STRENGTH;
  this.repulsionConstant = FDLayoutConstants.DEFAULT_REPULSION_STRENGTH;
  this.gravityConstant = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH;
  this.compoundGravityConstant = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH;
  this.gravityRangeFactor = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR;
  this.compoundGravityRangeFactor = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR;
  this.displacementThresholdPerNode = (3.0 * FDLayoutConstants.DEFAULT_EDGE_LENGTH) / 100;
  this.coolingFactor = 1.0;
  this.initialCoolingFactor = 1.0;
  this.totalDisplacement = 0.0;
  this.oldTotalDisplacement = 0.0;
  this.maxIterations = FDLayoutConstants.MAX_ITERATIONS;
}

FDLayout.prototype = Object.create(Layout.prototype);

for (var prop in Layout) {
  FDLayout[prop] = Layout[prop];
}

FDLayout.prototype.initParameters = function () {
  Layout.prototype.initParameters.call(this, arguments);

  if (this.layoutQuality == LayoutConstants.DRAFT_QUALITY)
  {
    this.displacementThresholdPerNode += 0.30;
    this.maxIterations *= 0.8;
  }
  else if (this.layoutQuality == LayoutConstants.PROOF_QUALITY)
  {
    this.displacementThresholdPerNode -= 0.30;
    this.maxIterations *= 1.2;
  }

  this.totalIterations = 0;
  this.notAnimatedIterations = 0;

//    this.useFRGridVariant = layoutOptionsPack.smartRepulsionRangeCalc;
};

FDLayout.prototype.calcIdealEdgeLengths = function () {
  var edge;
  var lcaDepth;
  var source;
  var target;
  var sizeOfSourceInLca;
  var sizeOfTargetInLca;

  var allEdges = this.getGraphManager().getAllEdges();
  for (var i = 0; i < allEdges.length; i++)
  {
    edge = allEdges[i];

    edge.idealLength = this.idealEdgeLength;

    if (edge.isInterGraph)
    {
      source = edge.getSource();
      target = edge.getTarget();

      sizeOfSourceInLca = edge.getSourceInLca().getEstimatedSize();
      sizeOfTargetInLca = edge.getTargetInLca().getEstimatedSize();

      if (this.useSmartIdealEdgeLengthCalculation)
      {
        edge.idealLength += sizeOfSourceInLca + sizeOfTargetInLca -
                2 * LayoutConstants.SIMPLE_NODE_SIZE;
      }

      lcaDepth = edge.getLca().getInclusionTreeDepth();

      edge.idealLength += FDLayoutConstants.DEFAULT_EDGE_LENGTH *
              FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR *
              (source.getInclusionTreeDepth() +
                      target.getInclusionTreeDepth() - 2 * lcaDepth);
    }
  }
};

FDLayout.prototype.initSpringEmbedder = function () {

  if (this.incremental)
  {
    this.coolingFactor = 0.8;
    this.initialCoolingFactor = 0.8;
    this.maxNodeDisplacement =
            FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL;
  }
  else
  {
    this.coolingFactor = 1.0;
    this.initialCoolingFactor = 1.0;
    this.maxNodeDisplacement =
            FDLayoutConstants.MAX_NODE_DISPLACEMENT;
  }

  this.maxIterations =
          Math.max(this.getAllNodes().length * 5, this.maxIterations);

  this.totalDisplacementThreshold =
          this.displacementThresholdPerNode * this.getAllNodes().length;

  this.repulsionRange = this.calcRepulsionRange();
};

FDLayout.prototype.calcSpringForces = function () {
  var lEdges = this.getAllEdges();
  var edge;

  for (var i = 0; i < lEdges.length; i++)
  {
    edge = lEdges[i];

    this.calcSpringForce(edge, edge.idealLength);
  }
};

FDLayout.prototype.calcRepulsionForces = function () {
  var i, j;
  var nodeA, nodeB;
  var lNodes = this.getAllNodes();

  for (i = 0; i < lNodes.length; i++)
  {
    nodeA = lNodes[i];

    for (j = i + 1; j < lNodes.length; j++)
    {
      nodeB = lNodes[j];

      // If both nodes are not members of the same graph, skip.
      if (nodeA.getOwner() != nodeB.getOwner())
      {
        continue;
      }

      this.calcRepulsionForce(nodeA, nodeB);
    }
  }
};

FDLayout.prototype.calcGravitationalForces = function () {
  var node;
  var lNodes = this.getAllNodesToApplyGravitation();

  for (var i = 0; i < lNodes.length; i++)
  {
    node = lNodes[i];
    this.calcGravitationalForce(node);
  }
};

FDLayout.prototype.moveNodes = function () {
  var lNodes = this.getAllNodes();
  var node;

  for (var i = 0; i < lNodes.length; i++)
  {
    node = lNodes[i];
    node.move();
  }
}

FDLayout.prototype.calcSpringForce = function (edge, idealLength) {
  var sourceNode = edge.getSource();
  var targetNode = edge.getTarget();

  var length;
  var springForce;
  var springForceX;
  var springForceY;

  // Update edge length
  if (this.uniformLeafNodeSizes &&
          sourceNode.getChild() == null && targetNode.getChild() == null)
  {
    edge.updateLengthSimple();
  }
  else
  {
    edge.updateLength();

    if (edge.isOverlapingSourceAndTarget)
    {
      return;
    }
  }

  length = edge.getLength();

  // Calculate spring forces
  springForce = this.springConstant * (length - idealLength);

  // Project force onto x and y axes
  springForceX = springForce * (edge.lengthX / length);
  springForceY = springForce * (edge.lengthY / length);

  // Apply forces on the end nodes
  sourceNode.springForceX += springForceX;
  sourceNode.springForceY += springForceY;
  targetNode.springForceX -= springForceX;
  targetNode.springForceY -= springForceY;
};

FDLayout.prototype.calcRepulsionForce = function (nodeA, nodeB) {
  var rectA = nodeA.getRect();
  var rectB = nodeB.getRect();
  var overlapAmount = new Array(2);
  var clipPoints = new Array(4);
  var distanceX;
  var distanceY;
  var distanceSquared;
  var distance;
  var repulsionForce;
  var repulsionForceX;
  var repulsionForceY;

  if (rectA.intersects(rectB))// two nodes overlap
  {
    // calculate separation amount in x and y directions
    IGeometry.calcSeparationAmount(rectA,
            rectB,
            overlapAmount,
            FDLayoutConstants.DEFAULT_EDGE_LENGTH / 2.0);

    repulsionForceX = overlapAmount[0];
    repulsionForceY = overlapAmount[1];
  }
  else// no overlap
  {
    // calculate distance

    if (this.uniformLeafNodeSizes &&
            nodeA.getChild() == null && nodeB.getChild() == null)// simply base repulsion on distance of node centers
    {
      distanceX = rectB.getCenterX() - rectA.getCenterX();
      distanceY = rectB.getCenterY() - rectA.getCenterY();
    }
    else// use clipping points
    {
      IGeometry.getIntersection(rectA, rectB, clipPoints);

      distanceX = clipPoints[2] - clipPoints[0];
      distanceY = clipPoints[3] - clipPoints[1];
    }

    // No repulsion range. FR grid variant should take care of this.
    if (Math.abs(distanceX) < FDLayoutConstants.MIN_REPULSION_DIST)
    {
      distanceX = IMath.sign(distanceX) *
              FDLayoutConstants.MIN_REPULSION_DIST;
    }

    if (Math.abs(distanceY) < FDLayoutConstants.MIN_REPULSION_DIST)
    {
      distanceY = IMath.sign(distanceY) *
              FDLayoutConstants.MIN_REPULSION_DIST;
    }

    distanceSquared = distanceX * distanceX + distanceY * distanceY;
    distance = Math.sqrt(distanceSquared);

    repulsionForce = this.repulsionConstant / distanceSquared;

    // Project force onto x and y axes
    repulsionForceX = repulsionForce * distanceX / distance;
    repulsionForceY = repulsionForce * distanceY / distance;
  }

  // Apply forces on the two nodes
  nodeA.repulsionForceX -= repulsionForceX;
  nodeA.repulsionForceY -= repulsionForceY;
  nodeB.repulsionForceX += repulsionForceX;
  nodeB.repulsionForceY += repulsionForceY;
};

FDLayout.prototype.calcGravitationalForce = function (node) {
  var ownerGraph;
  var ownerCenterX;
  var ownerCenterY;
  var distanceX;
  var distanceY;
  var absDistanceX;
  var absDistanceY;
  var estimatedSize;
  ownerGraph = node.getOwner();

  ownerCenterX = (ownerGraph.getRight() + ownerGraph.getLeft()) / 2;
  ownerCenterY = (ownerGraph.getTop() + ownerGraph.getBottom()) / 2;
  distanceX = node.getCenterX() - ownerCenterX;
  distanceY = node.getCenterY() - ownerCenterY;
  absDistanceX = Math.abs(distanceX);
  absDistanceY = Math.abs(distanceY);

  if (node.getOwner() == this.graphManager.getRoot())// in the root graph
  {
    Math.floor(80);
    estimatedSize = Math.floor(ownerGraph.getEstimatedSize() *
            this.gravityRangeFactor);

    if (absDistanceX > estimatedSize || absDistanceY > estimatedSize)
    {
      node.gravitationForceX = -this.gravityConstant * distanceX;
      node.gravitationForceY = -this.gravityConstant * distanceY;
    }
  }
  else// inside a compound
  {
    estimatedSize = Math.floor((ownerGraph.getEstimatedSize() *
            this.compoundGravityRangeFactor));

    if (absDistanceX > estimatedSize || absDistanceY > estimatedSize)
    {
      node.gravitationForceX = -this.gravityConstant * distanceX *
              this.compoundGravityConstant;
      node.gravitationForceY = -this.gravityConstant * distanceY *
              this.compoundGravityConstant;
    }
  }
};

FDLayout.prototype.isConverged = function () {
  var converged;
  var oscilating = false;

  if (this.totalIterations > this.maxIterations / 3)
  {
    oscilating =
            Math.abs(this.totalDisplacement - this.oldTotalDisplacement) < 2;
  }

  converged = this.totalDisplacement < this.totalDisplacementThreshold;

  this.oldTotalDisplacement = this.totalDisplacement;

  return converged || oscilating;
};

FDLayout.prototype.animate = function () {
  if (this.animationDuringLayout && !this.isSubLayout)
  {
    if (this.notAnimatedIterations == this.animationPeriod)
    {
      this.update();
      this.notAnimatedIterations = 0;
    }
    else
    {
      this.notAnimatedIterations++;
    }
  }
};

FDLayout.prototype.calcRepulsionRange = function () {
  return 0.0;
};

module.exports = FDLayout;

},{"./FDLayoutConstants":10,"./IGeometry":15,"./IMath":16,"./Layout":23,"./LayoutConstants":24}],10:[function(require,module,exports){
var LayoutConstants = require('./LayoutConstants');

function FDLayoutConstants() {
}

//FDLayoutConstants inherits static props in LayoutConstants
for (var prop in LayoutConstants) {
  FDLayoutConstants[prop] = LayoutConstants[prop];
}

FDLayoutConstants.MAX_ITERATIONS = 2500;

FDLayoutConstants.DEFAULT_EDGE_LENGTH = 50;
FDLayoutConstants.DEFAULT_SPRING_STRENGTH = 0.45;
FDLayoutConstants.DEFAULT_REPULSION_STRENGTH = 4500.0;
FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = 0.4;
FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = 1.0;
FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = 3.8;
FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = 1.5;
FDLayoutConstants.DEFAULT_USE_SMART_IDEAL_EDGE_LENGTH_CALCULATION = true;
FDLayoutConstants.DEFAULT_USE_SMART_REPULSION_RANGE_CALCULATION = true;
FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL = 100.0;
FDLayoutConstants.MAX_NODE_DISPLACEMENT = FDLayoutConstants.MAX_NODE_DISPLACEMENT_INCREMENTAL * 3;
FDLayoutConstants.MIN_REPULSION_DIST = FDLayoutConstants.DEFAULT_EDGE_LENGTH / 10.0;
FDLayoutConstants.CONVERGENCE_CHECK_PERIOD = 100;
FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = 0.1;
FDLayoutConstants.MIN_EDGE_LENGTH = 1;
FDLayoutConstants.GRID_CALCULATION_CHECK_PERIOD = 10;

module.exports = FDLayoutConstants;

},{"./LayoutConstants":24}],11:[function(require,module,exports){
var LEdge = require('./LEdge');
var FDLayoutConstants = require('./FDLayoutConstants');

function FDLayoutEdge(source, target, vEdge) {
  LEdge.call(this, source, target, vEdge);
  this.idealLength = FDLayoutConstants.DEFAULT_EDGE_LENGTH;
}

FDLayoutEdge.prototype = Object.create(LEdge.prototype);

for (var prop in LEdge) {
  FDLayoutEdge[prop] = LEdge[prop];
}

module.exports = FDLayoutEdge;

},{"./FDLayoutConstants":10,"./LEdge":18}],12:[function(require,module,exports){
var LNode = require('./LNode');

function FDLayoutNode(gm, loc, size, vNode) {
  // alternative constructor is handled inside LNode
  LNode.call(this, gm, loc, size, vNode);
  //Spring, repulsion and gravitational forces acting on this node
  this.springForceX = 0;
  this.springForceY = 0;
  this.repulsionForceX = 0;
  this.repulsionForceY = 0;
  this.gravitationForceX = 0;
  this.gravitationForceY = 0;
  //Amount by which this node is to be moved in this iteration
  this.displacementX = 0;
  this.displacementY = 0;

  //Start and finish grid coordinates that this node is fallen into
  this.startX = 0;
  this.finishX = 0;
  this.startY = 0;
  this.finishY = 0;

  //Geometric neighbors of this node
  this.surrounding = [];
}

FDLayoutNode.prototype = Object.create(LNode.prototype);

for (var prop in LNode) {
  FDLayoutNode[prop] = LNode[prop];
}

FDLayoutNode.prototype.setGridCoordinates = function (_startX, _finishX, _startY, _finishY)
{
  this.startX = _startX;
  this.finishX = _finishX;
  this.startY = _startY;
  this.finishY = _finishY;

};

module.exports = FDLayoutNode;

},{"./LNode":22}],13:[function(require,module,exports){
var UniqueIDGeneretor = require('./UniqueIDGeneretor');

function HashMap() {
  this.map = {};
  this.keys = [];
}

HashMap.prototype.put = function (key, value) {
  var theId = UniqueIDGeneretor.createID(key);
  if (!this.contains(theId)) {
    this.map[theId] = value;
    this.keys.push(key);
  }
};

HashMap.prototype.contains = function (key) {
  var theId = UniqueIDGeneretor.createID(key);
  return this.map[key] != null;
};

HashMap.prototype.get = function (key) {
  var theId = UniqueIDGeneretor.createID(key);
  return this.map[theId];
};

HashMap.prototype.keySet = function () {
  return this.keys;
};

module.exports = HashMap;

},{"./UniqueIDGeneretor":30}],14:[function(require,module,exports){
var UniqueIDGeneretor = require('./UniqueIDGeneretor');

function HashSet() {
  this.set = {};
}
;

HashSet.prototype.add = function (obj) {
  var theId = UniqueIDGeneretor.createID(obj);
  if (!this.contains(theId))
    this.set[theId] = obj;
};

HashSet.prototype.remove = function (obj) {
  delete this.set[UniqueIDGeneretor.createID(obj)];
};

HashSet.prototype.clear = function () {
  this.set = {};
};

HashSet.prototype.contains = function (obj) {
  return this.set[UniqueIDGeneretor.createID(obj)] == obj;
};

HashSet.prototype.isEmpty = function () {
  return this.size() === 0;
};

HashSet.prototype.size = function () {
  return Object.keys(this.set).length;
};

//concats this.set to the given list
HashSet.prototype.addAllTo = function (list) {
  var keys = Object.keys(this.set);
  var length = keys.length;
  for (var i = 0; i < length; i++) {
    list.push(this.set[keys[i]]);
  }
};

HashSet.prototype.size = function () {
  return Object.keys(this.set).length;
};

HashSet.prototype.addAll = function (list) {
  var s = list.length;
  for (var i = 0; i < s; i++) {
    var v = list[i];
    this.add(v);
  }
};

module.exports = HashSet;

},{"./UniqueIDGeneretor":30}],15:[function(require,module,exports){
function IGeometry() {
}

IGeometry.calcSeparationAmount = function (rectA, rectB, overlapAmount, separationBuffer)
{
  if (!rectA.intersects(rectB)) {
    throw "assert failed";
  }
  var directions = new Array(2);
  IGeometry.decideDirectionsForOverlappingNodes(rectA, rectB, directions);
  overlapAmount[0] = Math.min(rectA.getRight(), rectB.getRight()) -
          Math.max(rectA.x, rectB.x);
  overlapAmount[1] = Math.min(rectA.getBottom(), rectB.getBottom()) -
          Math.max(rectA.y, rectB.y);
  // update the overlapping amounts for the following cases:
  if ((rectA.getX() <= rectB.getX()) && (rectA.getRight() >= rectB.getRight()))
  {
    overlapAmount[0] += Math.min((rectB.getX() - rectA.getX()),
            (rectA.getRight() - rectB.getRight()));
  }
  else if ((rectB.getX() <= rectA.getX()) && (rectB.getRight() >= rectA.getRight()))
  {
    overlapAmount[0] += Math.min((rectA.getX() - rectB.getX()),
            (rectB.getRight() - rectA.getRight()));
  }
  if ((rectA.getY() <= rectB.getY()) && (rectA.getBottom() >= rectB.getBottom()))
  {
    overlapAmount[1] += Math.min((rectB.getY() - rectA.getY()),
            (rectA.getBottom() - rectB.getBottom()));
  }
  else if ((rectB.getY() <= rectA.getY()) && (rectB.getBottom() >= rectA.getBottom()))
  {
    overlapAmount[1] += Math.min((rectA.getY() - rectB.getY()),
            (rectB.getBottom() - rectA.getBottom()));
  }

  // find slope of the line passes two centers
  var slope = Math.abs((rectB.getCenterY() - rectA.getCenterY()) /
          (rectB.getCenterX() - rectA.getCenterX()));
  // if centers are overlapped
  if ((rectB.getCenterY() == rectA.getCenterY()) &&
          (rectB.getCenterX() == rectA.getCenterX()))
  {
    // assume the slope is 1 (45 degree)
    slope = 1.0;
  }

  var moveByY = slope * overlapAmount[0];
  var moveByX = overlapAmount[1] / slope;
  if (overlapAmount[0] < moveByX)
  {
    moveByX = overlapAmount[0];
  }
  else
  {
    moveByY = overlapAmount[1];
  }
  // return half the amount so that if each rectangle is moved by these
  // amounts in opposite directions, overlap will be resolved
  overlapAmount[0] = -1 * directions[0] * ((moveByX / 2) + separationBuffer);
  overlapAmount[1] = -1 * directions[1] * ((moveByY / 2) + separationBuffer);
}

IGeometry.decideDirectionsForOverlappingNodes = function (rectA, rectB, directions)
{
  if (rectA.getCenterX() < rectB.getCenterX())
  {
    directions[0] = -1;
  }
  else
  {
    directions[0] = 1;
  }

  if (rectA.getCenterY() < rectB.getCenterY())
  {
    directions[1] = -1;
  }
  else
  {
    directions[1] = 1;
  }
}

IGeometry.getIntersection2 = function (rectA, rectB, result)
{
  //result[0-1] will contain clipPoint of rectA, result[2-3] will contain clipPoint of rectB
  var p1x = rectA.getCenterX();
  var p1y = rectA.getCenterY();
  var p2x = rectB.getCenterX();
  var p2y = rectB.getCenterY();

  //if two rectangles intersect, then clipping points are centers
  if (rectA.intersects(rectB))
  {
    result[0] = p1x;
    result[1] = p1y;
    result[2] = p2x;
    result[3] = p2y;
    return true;
  }
  //variables for rectA
  var topLeftAx = rectA.getX();
  var topLeftAy = rectA.getY();
  var topRightAx = rectA.getRight();
  var bottomLeftAx = rectA.getX();
  var bottomLeftAy = rectA.getBottom();
  var bottomRightAx = rectA.getRight();
  var halfWidthA = rectA.getWidthHalf();
  var halfHeightA = rectA.getHeightHalf();
  //variables for rectB
  var topLeftBx = rectB.getX();
  var topLeftBy = rectB.getY();
  var topRightBx = rectB.getRight();
  var bottomLeftBx = rectB.getX();
  var bottomLeftBy = rectB.getBottom();
  var bottomRightBx = rectB.getRight();
  var halfWidthB = rectB.getWidthHalf();
  var halfHeightB = rectB.getHeightHalf();
  //flag whether clipping points are found
  var clipPointAFound = false;
  var clipPointBFound = false;

  // line is vertical
  if (p1x == p2x)
  {
    if (p1y > p2y)
    {
      result[0] = p1x;
      result[1] = topLeftAy;
      result[2] = p2x;
      result[3] = bottomLeftBy;
      return false;
    }
    else if (p1y < p2y)
    {
      result[0] = p1x;
      result[1] = bottomLeftAy;
      result[2] = p2x;
      result[3] = topLeftBy;
      return false;
    }
    else
    {
      //not line, return null;
    }
  }
  // line is horizontal
  else if (p1y == p2y)
  {
    if (p1x > p2x)
    {
      result[0] = topLeftAx;
      result[1] = p1y;
      result[2] = topRightBx;
      result[3] = p2y;
      return false;
    }
    else if (p1x < p2x)
    {
      result[0] = topRightAx;
      result[1] = p1y;
      result[2] = topLeftBx;
      result[3] = p2y;
      return false;
    }
    else
    {
      //not valid line, return null;
    }
  }
  else
  {
    //slopes of rectA's and rectB's diagonals
    var slopeA = rectA.height / rectA.width;
    var slopeB = rectB.height / rectB.width;

    //slope of line between center of rectA and center of rectB
    var slopePrime = (p2y - p1y) / (p2x - p1x);
    var cardinalDirectionA;
    var cardinalDirectionB;
    var tempPointAx;
    var tempPointAy;
    var tempPointBx;
    var tempPointBy;

    //determine whether clipping point is the corner of nodeA
    if ((-slopeA) == slopePrime)
    {
      if (p1x > p2x)
      {
        result[0] = bottomLeftAx;
        result[1] = bottomLeftAy;
        clipPointAFound = true;
      }
      else
      {
        result[0] = topRightAx;
        result[1] = topLeftAy;
        clipPointAFound = true;
      }
    }
    else if (slopeA == slopePrime)
    {
      if (p1x > p2x)
      {
        result[0] = topLeftAx;
        result[1] = topLeftAy;
        clipPointAFound = true;
      }
      else
      {
        result[0] = bottomRightAx;
        result[1] = bottomLeftAy;
        clipPointAFound = true;
      }
    }

    //determine whether clipping point is the corner of nodeB
    if ((-slopeB) == slopePrime)
    {
      if (p2x > p1x)
      {
        result[2] = bottomLeftBx;
        result[3] = bottomLeftBy;
        clipPointBFound = true;
      }
      else
      {
        result[2] = topRightBx;
        result[3] = topLeftBy;
        clipPointBFound = true;
      }
    }
    else if (slopeB == slopePrime)
    {
      if (p2x > p1x)
      {
        result[2] = topLeftBx;
        result[3] = topLeftBy;
        clipPointBFound = true;
      }
      else
      {
        result[2] = bottomRightBx;
        result[3] = bottomLeftBy;
        clipPointBFound = true;
      }
    }

    //if both clipping points are corners
    if (clipPointAFound && clipPointBFound)
    {
      return false;
    }

    //determine Cardinal Direction of rectangles
    if (p1x > p2x)
    {
      if (p1y > p2y)
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(slopeA, slopePrime, 4);
        cardinalDirectionB = IGeometry.getCardinalDirection(slopeB, slopePrime, 2);
      }
      else
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(-slopeA, slopePrime, 3);
        cardinalDirectionB = IGeometry.getCardinalDirection(-slopeB, slopePrime, 1);
      }
    }
    else
    {
      if (p1y > p2y)
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(-slopeA, slopePrime, 1);
        cardinalDirectionB = IGeometry.getCardinalDirection(-slopeB, slopePrime, 3);
      }
      else
      {
        cardinalDirectionA = IGeometry.getCardinalDirection(slopeA, slopePrime, 2);
        cardinalDirectionB = IGeometry.getCardinalDirection(slopeB, slopePrime, 4);
      }
    }
    //calculate clipping Point if it is not found before
    if (!clipPointAFound)
    {
      switch (cardinalDirectionA)
      {
        case 1:
          tempPointAy = topLeftAy;
          tempPointAx = p1x + (-halfHeightA) / slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 2:
          tempPointAx = bottomRightAx;
          tempPointAy = p1y + halfWidthA * slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 3:
          tempPointAy = bottomLeftAy;
          tempPointAx = p1x + halfHeightA / slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
        case 4:
          tempPointAx = bottomLeftAx;
          tempPointAy = p1y + (-halfWidthA) * slopePrime;
          result[0] = tempPointAx;
          result[1] = tempPointAy;
          break;
      }
    }
    if (!clipPointBFound)
    {
      switch (cardinalDirectionB)
      {
        case 1:
          tempPointBy = topLeftBy;
          tempPointBx = p2x + (-halfHeightB) / slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 2:
          tempPointBx = bottomRightBx;
          tempPointBy = p2y + halfWidthB * slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 3:
          tempPointBy = bottomLeftBy;
          tempPointBx = p2x + halfHeightB / slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
        case 4:
          tempPointBx = bottomLeftBx;
          tempPointBy = p2y + (-halfWidthB) * slopePrime;
          result[2] = tempPointBx;
          result[3] = tempPointBy;
          break;
      }
    }
  }
  return false;
}

IGeometry.getCardinalDirection = function (slope, slopePrime, line)
{
  if (slope > slopePrime)
  {
    return line;
  }
  else
  {
    return 1 + line % 4;
  }
}

IGeometry.getIntersection = function (s1, s2, f1, f2)
{
  if (f2 == null) {
    return IGeometry.getIntersection2(s1, s2, f1);
  }
  var x1 = s1.x;
  var y1 = s1.y;
  var x2 = s2.x;
  var y2 = s2.y;
  var x3 = f1.x;
  var y3 = f1.y;
  var x4 = f2.x;
  var y4 = f2.y;
  var x, y; // intersection point
  var a1, a2, b1, b2, c1, c2; // coefficients of line eqns.
  var denom;

  a1 = y2 - y1;
  b1 = x1 - x2;
  c1 = x2 * y1 - x1 * y2;  // { a1*x + b1*y + c1 = 0 is line 1 }

  a2 = y4 - y3;
  b2 = x3 - x4;
  c2 = x4 * y3 - x3 * y4;  // { a2*x + b2*y + c2 = 0 is line 2 }

  denom = a1 * b2 - a2 * b1;

  if (denom == 0)
  {
    return null;
  }

  x = (b1 * c2 - b2 * c1) / denom;
  y = (a2 * c1 - a1 * c2) / denom;

  return new Point(x, y);
}

// -----------------------------------------------------------------------------
// Section: Class Constants
// -----------------------------------------------------------------------------
/**
 * Some useful pre-calculated constants
 */
IGeometry.HALF_PI = 0.5 * Math.PI;
IGeometry.ONE_AND_HALF_PI = 1.5 * Math.PI;
IGeometry.TWO_PI = 2.0 * Math.PI;
IGeometry.THREE_PI = 3.0 * Math.PI;

module.exports = IGeometry;

},{}],16:[function(require,module,exports){
function IMath() {
}

/**
 * This method returns the sign of the input value.
 */
IMath.sign = function (value) {
  if (value > 0)
  {
    return 1;
  }
  else if (value < 0)
  {
    return -1;
  }
  else
  {
    return 0;
  }
}

IMath.floor = function (value) {
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

IMath.ceil = function (value) {
  return value < 0 ? Math.floor(value) : Math.ceil(value);
}

module.exports = IMath;

},{}],17:[function(require,module,exports){
function Integer() {
}

Integer.MAX_VALUE = 2147483647;
Integer.MIN_VALUE = -2147483648;

module.exports = Integer;

},{}],18:[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');

function LEdge(source, target, vEdge) {
  LGraphObject.call(this, vEdge);

  this.isOverlapingSourceAndTarget = false;
  this.vGraphObject = vEdge;
  this.bendpoints = [];
  this.source = source;
  this.target = target;
}

LEdge.prototype = Object.create(LGraphObject.prototype);

for (var prop in LGraphObject) {
  LEdge[prop] = LGraphObject[prop];
}

LEdge.prototype.getSource = function ()
{
  return this.source;
};

LEdge.prototype.getTarget = function ()
{
  return this.target;
};

LEdge.prototype.isInterGraph = function ()
{
  return this.isInterGraph;
};

LEdge.prototype.getLength = function ()
{
  return this.length;
};

LEdge.prototype.isOverlapingSourceAndTarget = function ()
{
  return this.isOverlapingSourceAndTarget;
};

LEdge.prototype.getBendpoints = function ()
{
  return this.bendpoints;
};

LEdge.prototype.getLca = function ()
{
  return this.lca;
};

LEdge.prototype.getSourceInLca = function ()
{
  return this.sourceInLca;
};

LEdge.prototype.getTargetInLca = function ()
{
  return this.targetInLca;
};

LEdge.prototype.getOtherEnd = function (node)
{
  if (this.source === node)
  {
    return this.target;
  }
  else if (this.target === node)
  {
    return this.source;
  }
  else
  {
    throw "Node is not incident with this edge";
  }
}

LEdge.prototype.getOtherEndInGraph = function (node, graph)
{
  var otherEnd = this.getOtherEnd(node);
  var root = graph.getGraphManager().getRoot();

  while (true)
  {
    if (otherEnd.getOwner() == graph)
    {
      return otherEnd;
    }

    if (otherEnd.getOwner() == root)
    {
      break;
    }

    otherEnd = otherEnd.getOwner().getParent();
  }

  return null;
};

LEdge.prototype.updateLength = function ()
{
  var clipPointCoordinates = new Array(4);

  this.isOverlapingSourceAndTarget =
          IGeometry.getIntersection(this.target.getRect(),
                  this.source.getRect(),
                  clipPointCoordinates);

  if (!this.isOverlapingSourceAndTarget)
  {
    this.lengthX = clipPointCoordinates[0] - clipPointCoordinates[2];
    this.lengthY = clipPointCoordinates[1] - clipPointCoordinates[3];

    if (Math.abs(this.lengthX) < 1.0)
    {
      this.lengthX = IMath.sign(this.lengthX);
    }

    if (Math.abs(this.lengthY) < 1.0)
    {
      this.lengthY = IMath.sign(this.lengthY);
    }

    this.length = Math.sqrt(
            this.lengthX * this.lengthX + this.lengthY * this.lengthY);
  }
};

LEdge.prototype.updateLengthSimple = function ()
{
  this.lengthX = this.target.getCenterX() - this.source.getCenterX();
  this.lengthY = this.target.getCenterY() - this.source.getCenterY();

  if (Math.abs(this.lengthX) < 1.0)
  {
    this.lengthX = IMath.sign(this.lengthX);
  }

  if (Math.abs(this.lengthY) < 1.0)
  {
    this.lengthY = IMath.sign(this.lengthY);
  }

  this.length = Math.sqrt(
          this.lengthX * this.lengthX + this.lengthY * this.lengthY);
}

module.exports = LEdge;

},{"./IGeometry":15,"./IMath":16,"./LGraphObject":21}],19:[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var Integer = require('./Integer');
var LayoutConstants = require('./LayoutConstants');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var HashSet = require('./HashSet');
var RectangleD = require('./RectangleD');
var Point = require('./Point');

function LGraph(parent, obj2, vGraph) {
  LGraphObject.call(this, vGraph);
  this.estimatedSize = Integer.MIN_VALUE;
  this.margin = LayoutConstants.DEFAULT_GRAPH_MARGIN;
  this.edges = [];
  this.nodes = [];
  this.isConnected = false;
  this.parent = parent;

  if (obj2 != null && obj2 instanceof LGraphManager) {
    this.graphManager = obj2;
  }
  else if (obj2 != null && obj2 instanceof Layout) {
    this.graphManager = obj2.graphManager;
  }
}

LGraph.prototype = Object.create(LGraphObject.prototype);
for (var prop in LGraphObject) {
  LGraph[prop] = LGraphObject[prop];
}

LGraph.prototype.getNodes = function () {
  return this.nodes;
};

LGraph.prototype.getEdges = function () {
  return this.edges;
};

LGraph.prototype.getGraphManager = function ()
{
  return this.graphManager;
};

LGraph.prototype.getParent = function ()
{
  return this.parent;
};

LGraph.prototype.getLeft = function ()
{
  return this.left;
};

LGraph.prototype.getRight = function ()
{
  return this.right;
};

LGraph.prototype.getTop = function ()
{
  return this.top;
};

LGraph.prototype.getBottom = function ()
{
  return this.bottom;
};

LGraph.prototype.isConnected = function ()
{
  return this.isConnected;
};

LGraph.prototype.add = function (obj1, sourceNode, targetNode) {
  if (sourceNode == null && targetNode == null) {
    var newNode = obj1;
    if (this.graphManager == null) {
      throw "Graph has no graph mgr!";
    }
    if (this.getNodes().indexOf(newNode) > -1) {
      throw "Node already in graph!";
    }
    newNode.owner = this;
    this.getNodes().push(newNode);

    return newNode;
  }
  else {
    var newEdge = obj1;
    if (!(this.getNodes().indexOf(sourceNode) > -1 && (this.getNodes().indexOf(targetNode)) > -1)) {
      throw "Source or target not in graph!";
    }

    if (!(sourceNode.owner == targetNode.owner && sourceNode.owner == this)) {
      throw "Both owners must be this graph!";
    }

    if (sourceNode.owner != targetNode.owner)
    {
      return null;
    }

    // set source and target
    newEdge.source = sourceNode;
    newEdge.target = targetNode;

    // set as intra-graph edge
    newEdge.isInterGraph = false;

    // add to graph edge list
    this.getEdges().push(newEdge);

    // add to incidency lists
    sourceNode.edges.push(newEdge);

    if (targetNode != sourceNode)
    {
      targetNode.edges.push(newEdge);
    }

    return newEdge;
  }
};

LGraph.prototype.remove = function (obj) {
  var node = obj;
  if (obj instanceof LNode) {
    if (node == null) {
      throw "Node is null!";
    }
    if (!(node.owner != null && node.owner == this)) {
      throw "Owner graph is invalid!";
    }
    if (this.graphManager == null) {
      throw "Owner graph manager is invalid!";
    }
    // remove incident edges first (make a copy to do it safely)
    var edgesToBeRemoved = node.edges.slice();
    var edge;
    var s = edgesToBeRemoved.length;
    for (var i = 0; i < s; i++)
    {
      edge = edgesToBeRemoved[i];

      if (edge.isInterGraph)
      {
        this.graphManager.remove(edge);
      }
      else
      {
        edge.source.owner.remove(edge);
      }
    }

    // now the node itself
    var index = this.nodes.indexOf(node);
    if (index == -1) {
      throw "Node not in owner node list!";
    }

    this.nodes.splice(index, 1);
  }
  else if (obj instanceof LEdge) {
    var edge = obj;
    if (edge == null) {
      throw "Edge is null!";
    }
    if (!(edge.source != null && edge.target != null)) {
      throw "Source and/or target is null!";
    }
    if (!(edge.source.owner != null && edge.target.owner != null &&
            edge.source.owner == this && edge.target.owner == this)) {
      throw "Source and/or target owner is invalid!";
    }

    var sourceIndex = edge.source.edges.indexOf(edge);
    var targetIndex = edge.target.edges.indexOf(edge);
    if (!(sourceIndex > -1 && targetIndex > -1)) {
      throw "Source and/or target doesn't know this edge!";
    }

    edge.source.edges.splice(sourceIndex, 1);

    if (edge.target != edge.source)
    {
      edge.target.edges.splice(targetIndex, 1);
    }

    var index = edge.source.owner.getEdges().indexOf(edge);
    if (index == -1) {
      throw "Not in owner's edge list!";
    }

    edge.source.owner.getEdges().splice(index, 1);
  }
};

LGraph.prototype.updateLeftTop = function ()
{
  var top = Integer.MAX_VALUE;
  var left = Integer.MAX_VALUE;
  var nodeTop;
  var nodeLeft;

  var nodes = this.getNodes();
  var s = nodes.length;

  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];
    nodeTop = Math.floor(lNode.getTop());
    nodeLeft = Math.floor(lNode.getLeft());

    if (top > nodeTop)
    {
      top = nodeTop;
    }

    if (left > nodeLeft)
    {
      left = nodeLeft;
    }
  }

  // Do we have any nodes in this graph?
  if (top == Integer.MAX_VALUE)
  {
    return null;
  }

  this.left = left - this.margin;
  this.top = top - this.margin;

  // Apply the margins and return the result
  return new Point(this.left, this.top);
};

LGraph.prototype.updateBounds = function (recursive)
{
  // calculate bounds
  var left = Integer.MAX_VALUE;
  var right = -Integer.MAX_VALUE;
  var top = Integer.MAX_VALUE;
  var bottom = -Integer.MAX_VALUE;
  var nodeLeft;
  var nodeRight;
  var nodeTop;
  var nodeBottom;

  var nodes = this.nodes;
  var s = nodes.length;
  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];

    if (recursive && lNode.child != null)
    {
      lNode.updateBounds();
    }
    nodeLeft = Math.floor(lNode.getLeft());
    nodeRight = Math.floor(lNode.getRight());
    nodeTop = Math.floor(lNode.getTop());
    nodeBottom = Math.floor(lNode.getBottom());

    if (left > nodeLeft)
    {
      left = nodeLeft;
    }

    if (right < nodeRight)
    {
      right = nodeRight;
    }

    if (top > nodeTop)
    {
      top = nodeTop;
    }

    if (bottom < nodeBottom)
    {
      bottom = nodeBottom;
    }
  }

  var boundingRect = new RectangleD(left, top, right - left, bottom - top);
  if (left == Integer.MAX_VALUE)
  {
    this.left = Math.floor(this.parent.getLeft());
    this.right = Math.floor(this.parent.getRight());
    this.top = Math.floor(this.parent.getTop());
    this.bottom = Math.floor(this.parent.getBottom());
  }

  this.left = boundingRect.x - this.margin;
  this.right = boundingRect.x + boundingRect.width + this.margin;
  this.top = boundingRect.y - this.margin;
  this.bottom = boundingRect.y + boundingRect.height + this.margin;
};

LGraph.calculateBounds = function (nodes)
{
  var left = Integer.MAX_VALUE;
  var right = -Integer.MAX_VALUE;
  var top = Integer.MAX_VALUE;
  var bottom = -Integer.MAX_VALUE;
  var nodeLeft;
  var nodeRight;
  var nodeTop;
  var nodeBottom;

  var s = nodes.length;

  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];
    nodeLeft = Math.floor(lNode.getLeft());
    nodeRight = Math.floor(lNode.getRight());
    nodeTop = Math.floor(lNode.getTop());
    nodeBottom = Math.floor(lNode.getBottom());

    if (left > nodeLeft)
    {
      left = nodeLeft;
    }

    if (right < nodeRight)
    {
      right = nodeRight;
    }

    if (top > nodeTop)
    {
      top = nodeTop;
    }

    if (bottom < nodeBottom)
    {
      bottom = nodeBottom;
    }
  }

  var boundingRect = new RectangleD(left, top, right - left, bottom - top);

  return boundingRect;
};

LGraph.prototype.getInclusionTreeDepth = function ()
{
  if (this == this.graphManager.getRoot())
  {
    return 1;
  }
  else
  {
    return this.parent.getInclusionTreeDepth();
  }
};

LGraph.prototype.getEstimatedSize = function ()
{
  if (this.estimatedSize == Integer.MIN_VALUE) {
    throw "assert failed";
  }
  return this.estimatedSize;
};

LGraph.prototype.calcEstimatedSize = function ()
{
  var size = 0;
  var nodes = this.nodes;
  var s = nodes.length;

  for (var i = 0; i < s; i++)
  {
    var lNode = nodes[i];
    size += lNode.calcEstimatedSize();
  }

  if (size == 0)
  {
    this.estimatedSize = LayoutConstants.EMPTY_COMPOUND_NODE_SIZE;
  }
  else
  {
    this.estimatedSize = Math.floor(size / Math.sqrt(this.nodes.length));
  }

  return Math.floor(this.estimatedSize);
};

LGraph.prototype.updateConnected = function ()
{
  var self = this;
  if (this.nodes.length == 0)
  {
    this.isConnected = true;
    return;
  }

  var toBeVisited = [];
  var visited = new HashSet();
  var currentNode = this.nodes[0];
  var neighborEdges;
  var currentNeighbor;
  toBeVisited = toBeVisited.concat(currentNode.withChildren());

  while (toBeVisited.length > 0)
  {
    currentNode = toBeVisited.shift();
    visited.add(currentNode);

    // Traverse all neighbors of this node
    neighborEdges = currentNode.getEdges();
    var s = neighborEdges.length;
    for (var i = 0; i < s; i++)
    {
      var neighborEdge = neighborEdges[i];
      currentNeighbor =
              neighborEdge.getOtherEndInGraph(currentNode, this);

      // Add unvisited neighbors to the list to visit
      if (currentNeighbor != null &&
              !visited.contains(currentNeighbor))
      {
        toBeVisited = toBeVisited.concat(currentNeighbor.withChildren());
      }
    }
  }

  this.isConnected = false;

  if (visited.size() >= this.nodes.length)
  {
    var noOfVisitedInThisGraph = 0;
    
    var s = visited.size();
     Object.keys(visited.set).forEach(function(visitedId) {
      var visitedNode = visited.set[visitedId];
      if (visitedNode.owner == self)
      {
        noOfVisitedInThisGraph++;
      }
    });

    if (noOfVisitedInThisGraph == this.nodes.length)
    {
      this.isConnected = true;
    }
  }
};

module.exports = LGraph;

},{"./HashSet":14,"./Integer":17,"./LGraphManager":20,"./LGraphObject":21,"./LNode":22,"./LayoutConstants":24,"./Point":25,"./RectangleD":28}],20:[function(require,module,exports){
var LGraph;
var LEdge = require('./LEdge');

function LGraphManager(layout) {
  LGraph = require('./LGraph');
  this.layout = layout;

  this.graphs = [];
  this.edges = [];
}

LGraphManager.prototype.addRoot = function ()
{
  var ngraph = this.layout.newGraph();
  var nnode = this.layout.newNode(null);
  var root = this.add(ngraph, nnode);
  this.setRootGraph(root);
  return this.rootGraph;
};

LGraphManager.prototype.add = function (newGraph, parentNode, newEdge, sourceNode, targetNode)
{
  //there are just 2 parameters are passed then it adds an LGraph else it adds an LEdge
  if (newEdge == null && sourceNode == null && targetNode == null) {
    if (newGraph == null) {
      throw "Graph is null!";
    }
    if (parentNode == null) {
      throw "Parent node is null!";
    }
    if (this.graphs.indexOf(newGraph) > -1) {
      throw "Graph already in this graph mgr!";
    }

    this.graphs.push(newGraph);

    if (newGraph.parent != null) {
      throw "Already has a parent!";
    }
    if (parentNode.child != null) {
      throw  "Already has a child!";
    }

    newGraph.parent = parentNode;
    parentNode.child = newGraph;

    return newGraph;
  }
  else {
    //change the order of the parameters
    targetNode = newEdge;
    sourceNode = parentNode;
    newEdge = newGraph;
    var sourceGraph = sourceNode.getOwner();
    var targetGraph = targetNode.getOwner();

    if (!(sourceGraph != null && sourceGraph.getGraphManager() == this)) {
      throw "Source not in this graph mgr!";
    }
    if (!(targetGraph != null && targetGraph.getGraphManager() == this)) {
      throw "Target not in this graph mgr!";
    }

    if (sourceGraph == targetGraph)
    {
      newEdge.isInterGraph = false;
      return sourceGraph.add(newEdge, sourceNode, targetNode);
    }
    else
    {
      newEdge.isInterGraph = true;

      // set source and target
      newEdge.source = sourceNode;
      newEdge.target = targetNode;

      // add edge to inter-graph edge list
      if (this.edges.indexOf(newEdge) > -1) {
        throw "Edge already in inter-graph edge list!";
      }

      this.edges.push(newEdge);

      // add edge to source and target incidency lists
      if (!(newEdge.source != null && newEdge.target != null)) {
        throw "Edge source and/or target is null!";
      }

      if (!(newEdge.source.edges.indexOf(newEdge) == -1 && newEdge.target.edges.indexOf(newEdge) == -1)) {
        throw "Edge already in source and/or target incidency list!";
      }

      newEdge.source.edges.push(newEdge);
      newEdge.target.edges.push(newEdge);

      return newEdge;
    }
  }
};

LGraphManager.prototype.remove = function (lObj) {
  if (lObj instanceof LGraph) {
    var graph = lObj;
    if (graph.getGraphManager() != this) {
      throw "Graph not in this graph mgr";
    }
    if (!(graph == this.rootGraph || (graph.parent != null && graph.parent.graphManager == this))) {
      throw "Invalid parent node!";
    }

    // first the edges (make a copy to do it safely)
    var edgesToBeRemoved = [];

    edgesToBeRemoved = edgesToBeRemoved.concat(graph.getEdges());

    var edge;
    var s = edgesToBeRemoved.length;
    for (var i = 0; i < s; i++)
    {
      edge = edgesToBeRemoved[i];
      graph.remove(edge);
    }

    // then the nodes (make a copy to do it safely)
    var nodesToBeRemoved = [];

    nodesToBeRemoved = nodesToBeRemoved.concat(graph.getNodes());

    var node;
    s = nodesToBeRemoved.length;
    for (var i = 0; i < s; i++)
    {
      node = nodesToBeRemoved[i];
      graph.remove(node);
    }

    // check if graph is the root
    if (graph == this.rootGraph)
    {
      this.setRootGraph(null);
    }

    // now remove the graph itself
    var index = this.graphs.indexOf(graph);
    this.graphs.splice(index, 1);

    // also reset the parent of the graph
    graph.parent = null;
  }
  else if (lObj instanceof LEdge) {
    edge = lObj;
    if (edge == null) {
      throw "Edge is null!";
    }
    if (!edge.isInterGraph) {
      throw "Not an inter-graph edge!";
    }
    if (!(edge.source != null && edge.target != null)) {
      throw "Source and/or target is null!";
    }

    // remove edge from source and target nodes' incidency lists

    if (!(edge.source.edges.indexOf(edge) != -1 && edge.target.edges.indexOf(edge) != -1)) {
      throw "Source and/or target doesn't know this edge!";
    }

    var index = edge.source.edges.indexOf(edge);
    edge.source.edges.splice(index, 1);
    index = edge.target.edges.indexOf(edge);
    edge.target.edges.splice(index, 1);

    // remove edge from owner graph manager's inter-graph edge list

    if (!(edge.source.owner != null && edge.source.owner.getGraphManager() != null)) {
      throw "Edge owner graph or owner graph manager is null!";
    }
    if (edge.source.owner.getGraphManager().edges.indexOf(edge) == -1) {
      throw "Not in owner graph manager's edge list!";
    }

    var index = edge.source.owner.getGraphManager().edges.indexOf(edge);
    edge.source.owner.getGraphManager().edges.splice(index, 1);
  }
};

LGraphManager.prototype.updateBounds = function ()
{
  this.rootGraph.updateBounds(true);
};

LGraphManager.prototype.getGraphs = function ()
{
  return this.graphs;
};

LGraphManager.prototype.getAllNodes = function ()
{
  if (this.allNodes == null)
  {
    var nodeList = [];
    var graphs = this.getGraphs();
    var s = graphs.length;
    for (var i = 0; i < s; i++)
    {
      nodeList = nodeList.concat(graphs[i].getNodes());
    }
    this.allNodes = nodeList;
  }
  return this.allNodes;
};

LGraphManager.prototype.resetAllNodes = function ()
{
  this.allNodes = null;
};

LGraphManager.prototype.resetAllEdges = function ()
{
  this.allEdges = null;
};

LGraphManager.prototype.resetAllNodesToApplyGravitation = function ()
{
  this.allNodesToApplyGravitation = null;
};

LGraphManager.prototype.getAllEdges = function ()
{
  if (this.allEdges == null)
  {
    var edgeList = [];
    var graphs = this.getGraphs();
    var s = graphs.length;
    for (var i = 0; i < graphs.length; i++)
    {
      edgeList = edgeList.concat(graphs[i].getEdges());
    }

    edgeList = edgeList.concat(this.edges);

    this.allEdges = edgeList;
  }
  return this.allEdges;
};

LGraphManager.prototype.getAllNodesToApplyGravitation = function ()
{
  return this.allNodesToApplyGravitation;
};

LGraphManager.prototype.setAllNodesToApplyGravitation = function (nodeList)
{
  if (this.allNodesToApplyGravitation != null) {
    throw "assert failed";
  }

  this.allNodesToApplyGravitation = nodeList;
};

LGraphManager.prototype.getRoot = function ()
{
  return this.rootGraph;
};

LGraphManager.prototype.setRootGraph = function (graph)
{
  if (graph.getGraphManager() != this) {
    throw "Root not in this graph mgr!";
  }

  this.rootGraph = graph;
  // root graph must have a root node associated with it for convenience
  if (graph.parent == null)
  {
    graph.parent = this.layout.newNode("Root node");
  }
};

LGraphManager.prototype.getLayout = function ()
{
  return this.layout;
};

LGraphManager.prototype.isOneAncestorOfOther = function (firstNode, secondNode)
{
  if (!(firstNode != null && secondNode != null)) {
    throw "assert failed";
  }

  if (firstNode == secondNode)
  {
    return true;
  }
  // Is second node an ancestor of the first one?
  var ownerGraph = firstNode.getOwner();
  var parentNode;

  do
  {
    parentNode = ownerGraph.getParent();

    if (parentNode == null)
    {
      break;
    }

    if (parentNode == secondNode)
    {
      return true;
    }

    ownerGraph = parentNode.getOwner();
    if (ownerGraph == null)
    {
      break;
    }
  } while (true);
  // Is first node an ancestor of the second one?
  ownerGraph = secondNode.getOwner();

  do
  {
    parentNode = ownerGraph.getParent();

    if (parentNode == null)
    {
      break;
    }

    if (parentNode == firstNode)
    {
      return true;
    }

    ownerGraph = parentNode.getOwner();
    if (ownerGraph == null)
    {
      break;
    }
  } while (true);

  return false;
};

LGraphManager.prototype.calcLowestCommonAncestors = function ()
{
  var edge;
  var sourceNode;
  var targetNode;
  var sourceAncestorGraph;
  var targetAncestorGraph;

  var edges = this.getAllEdges();
  var s = edges.length;
  for (var i = 0; i < s; i++)
  {
    edge = edges[i];

    sourceNode = edge.source;
    targetNode = edge.target;
    edge.lca = null;
    edge.sourceInLca = sourceNode;
    edge.targetInLca = targetNode;

    if (sourceNode == targetNode)
    {
      edge.lca = sourceNode.getOwner();
      continue;
    }

    sourceAncestorGraph = sourceNode.getOwner();

    while (edge.lca == null)
    {
      targetAncestorGraph = targetNode.getOwner();

      while (edge.lca == null)
      {
        if (targetAncestorGraph == sourceAncestorGraph)
        {
          edge.lca = targetAncestorGraph;
          break;
        }

        if (targetAncestorGraph == this.rootGraph)
        {
          break;
        }

        if (edge.lca != null) {
          throw "assert failed";
        }
        edge.targetInLca = targetAncestorGraph.getParent();
        targetAncestorGraph = edge.targetInLca.getOwner();
      }

      if (sourceAncestorGraph == this.rootGraph)
      {
        break;
      }

      if (edge.lca == null)
      {
        edge.sourceInLca = sourceAncestorGraph.getParent();
        sourceAncestorGraph = edge.sourceInLca.getOwner();
      }
    }

    if (edge.lca == null) {
      throw "assert failed";
    }
  }
};

LGraphManager.prototype.calcLowestCommonAncestor = function (firstNode, secondNode)
{
  if (firstNode == secondNode)
  {
    return firstNode.getOwner();
  }
  var firstOwnerGraph = firstNode.getOwner();

  do
  {
    if (firstOwnerGraph == null)
    {
      break;
    }
    var secondOwnerGraph = secondNode.getOwner();

    do
    {
      if (secondOwnerGraph == null)
      {
        break;
      }

      if (secondOwnerGraph == firstOwnerGraph)
      {
        return secondOwnerGraph;
      }
      secondOwnerGraph = secondOwnerGraph.getParent().getOwner();
    } while (true);

    firstOwnerGraph = firstOwnerGraph.getParent().getOwner();
  } while (true);

  return firstOwnerGraph;
};

LGraphManager.prototype.calcInclusionTreeDepths = function (graph, depth) {
  if (graph == null && depth == null) {
    graph = this.rootGraph;
    depth = 1;
  }
  var node;

  var nodes = graph.getNodes();
  var s = nodes.length;
  for (var i = 0; i < s; i++)
  {
    node = nodes[i];
    node.inclusionTreeDepth = depth;

    if (node.child != null)
    {
      this.calcInclusionTreeDepths(node.child, depth + 1);
    }
  }
};

LGraphManager.prototype.includesInvalidEdge = function ()
{
  var edge;

  var s = this.edges.length;
  for (var i = 0; i < s; i++)
  {
    edge = this.edges[i];

    if (this.isOneAncestorOfOther(edge.source, edge.target))
    {
      return true;
    }
  }
  return false;
};

module.exports = LGraphManager;

},{"./LEdge":18,"./LGraph":19}],21:[function(require,module,exports){
function LGraphObject(vGraphObject) {
  this.vGraphObject = vGraphObject;
}

module.exports = LGraphObject;

},{}],22:[function(require,module,exports){
var LGraphObject = require('./LGraphObject');
var Integer = require('./Integer');
var RectangleD = require('./RectangleD');
var LayoutConstants = require('./LayoutConstants');
var RandomSeed = require('./RandomSeed');
var PointD = require('./PointD');
var HashSet = require('./HashSet');

function LNode(gm, loc, size, vNode) {
  //Alternative constructor 1 : LNode(LGraphManager gm, Point loc, Dimension size, Object vNode)
  if (size == null && vNode == null) {
    vNode = loc;
  }

  LGraphObject.call(this, vNode);

  //Alternative constructor 2 : LNode(Layout layout, Object vNode)
  if (gm.graphManager != null)
    gm = gm.graphManager;

  this.estimatedSize = Integer.MIN_VALUE;
  this.inclusionTreeDepth = Integer.MAX_VALUE;
  this.vGraphObject = vNode;
  this.edges = [];
  this.graphManager = gm;

  if (size != null && loc != null)
    this.rect = new RectangleD(loc.x, loc.y, size.width, size.height);
  else
    this.rect = new RectangleD();
}

LNode.prototype = Object.create(LGraphObject.prototype);
for (var prop in LGraphObject) {
  LNode[prop] = LGraphObject[prop];
}

LNode.prototype.getEdges = function ()
{
  return this.edges;
};

LNode.prototype.getChild = function ()
{
  return this.child;
};

LNode.prototype.getOwner = function ()
{
  if (this.owner != null) {
    if (!(this.owner == null || this.owner.getNodes().indexOf(this) > -1)) {
      throw "assert failed";
    }
  }

  return this.owner;
};

LNode.prototype.getWidth = function ()
{
  return this.rect.width;
};

LNode.prototype.setWidth = function (width)
{
  this.rect.width = width;
};

LNode.prototype.getHeight = function ()
{
  return this.rect.height;
};

LNode.prototype.setHeight = function (height)
{
  this.rect.height = height;
};

LNode.prototype.getCenterX = function ()
{
  return this.rect.x + this.rect.width / 2;
};

LNode.prototype.getCenterY = function ()
{
  return this.rect.y + this.rect.height / 2;
};

LNode.prototype.getCenter = function ()
{
  return new PointD(this.rect.x + this.rect.width / 2,
          this.rect.y + this.rect.height / 2);
};

LNode.prototype.getLocation = function ()
{
  return new PointD(this.rect.x, this.rect.y);
};

LNode.prototype.getRect = function ()
{
  return this.rect;
};

LNode.prototype.getDiagonal = function ()
{
  return Math.sqrt(this.rect.width * this.rect.width +
          this.rect.height * this.rect.height);
};

LNode.prototype.setRect = function (upperLeft, dimension)
{
  this.rect.x = upperLeft.x;
  this.rect.y = upperLeft.y;
  this.rect.width = dimension.width;
  this.rect.height = dimension.height;
};

LNode.prototype.setCenter = function (cx, cy)
{
  this.rect.x = cx - this.rect.width / 2;
  this.rect.y = cy - this.rect.height / 2;
};

LNode.prototype.setLocation = function (x, y)
{
  this.rect.x = x;
  this.rect.y = y;
};

LNode.prototype.moveBy = function (dx, dy)
{
  this.rect.x += dx;
  this.rect.y += dy;
};

LNode.prototype.getEdgeListToNode = function (to)
{
  var edgeList = [];
  var edge;
  var self = this;

  self.edges.forEach(function(edge) {
    
    if (edge.target == to)
    {
      if (edge.source != self)
        throw "Incorrect edge source!";

      edgeList.push(edge);
    }
  });

  return edgeList;
};

LNode.prototype.getEdgesBetween = function (other)
{
  var edgeList = [];
  var edge;
  
  var self = this;
  self.edges.forEach(function(edge) {

    if (!(edge.source == self || edge.target == self))
      throw "Incorrect edge source and/or target";

    if ((edge.target == other) || (edge.source == other))
    {
      edgeList.push(edge);
    }
  });

  return edgeList;
};

LNode.prototype.getNeighborsList = function ()
{
  var neighbors = new HashSet();
  var edge;
  
  var self = this;
  self.edges.forEach(function(edge) {

    if (edge.source == self)
    {
      neighbors.add(edge.target);
    }
    else
    {
      if (edge.target != self) {
        throw "Incorrect incidency!";
      }
    
      neighbors.add(edge.source);
    }
  });

  return neighbors;
};

LNode.prototype.withChildren = function ()
{
  var withNeighborsList = [];
  var childNode;

  withNeighborsList.push(this);

  if (this.child != null)
  {
    var nodes = this.child.getNodes();
    for (var i = 0; i < nodes.length; i++)
    {
      childNode = nodes[i];

      withNeighborsList = withNeighborsList.concat(childNode.withChildren());
    }
  }

  return withNeighborsList;
};

LNode.prototype.getEstimatedSize = function () {
  if (this.estimatedSize == Integer.MIN_VALUE) {
    throw "assert failed";
  }
  return this.estimatedSize;
};

LNode.prototype.calcEstimatedSize = function () {
  if (this.child == null)
  {
    return this.estimatedSize = Math.floor((this.rect.width + this.rect.height) / 2);
  }
  else
  {
    this.estimatedSize = this.child.calcEstimatedSize();
    this.rect.width = this.estimatedSize;
    this.rect.height = this.estimatedSize;

    return this.estimatedSize;
  }
};

LNode.prototype.scatter = function () {
  var randomCenterX;
  var randomCenterY;

  var minX = -LayoutConstants.INITIAL_WORLD_BOUNDARY;
  var maxX = LayoutConstants.INITIAL_WORLD_BOUNDARY;
  randomCenterX = LayoutConstants.WORLD_CENTER_X +
          (RandomSeed.nextDouble() * (maxX - minX)) + minX;

  var minY = -LayoutConstants.INITIAL_WORLD_BOUNDARY;
  var maxY = LayoutConstants.INITIAL_WORLD_BOUNDARY;
  randomCenterY = LayoutConstants.WORLD_CENTER_Y +
          (RandomSeed.nextDouble() * (maxY - minY)) + minY;

  this.rect.x = randomCenterX;
  this.rect.y = randomCenterY
};

LNode.prototype.updateBounds = function () {
  if (this.getChild() == null) {
    throw "assert failed";
  }
  if (this.getChild().getNodes().length != 0)
  {
    // wrap the children nodes by re-arranging the boundaries
    var childGraph = this.getChild();
    childGraph.updateBounds(true);

    this.rect.x = childGraph.getLeft();
    this.rect.y = childGraph.getTop();

    this.setWidth(childGraph.getRight() - childGraph.getLeft());
    this.setHeight(childGraph.getBottom() - childGraph.getTop());
  }
};

LNode.prototype.getInclusionTreeDepth = function ()
{
  if (this.inclusionTreeDepth == Integer.MAX_VALUE) {
    throw "assert failed";
  }
  return this.inclusionTreeDepth;
};

LNode.prototype.transform = function (trans)
{
  var left = this.rect.x;

  if (left > LayoutConstants.WORLD_BOUNDARY)
  {
    left = LayoutConstants.WORLD_BOUNDARY;
  }
  else if (left < -LayoutConstants.WORLD_BOUNDARY)
  {
    left = -LayoutConstants.WORLD_BOUNDARY;
  }

  var top = this.rect.y;

  if (top > LayoutConstants.WORLD_BOUNDARY)
  {
    top = LayoutConstants.WORLD_BOUNDARY;
  }
  else if (top < -LayoutConstants.WORLD_BOUNDARY)
  {
    top = -LayoutConstants.WORLD_BOUNDARY;
  }

  var leftTop = new PointD(left, top);
  var vLeftTop = trans.inverseTransformPoint(leftTop);

  this.setLocation(vLeftTop.x, vLeftTop.y);
};

LNode.prototype.getLeft = function ()
{
  return this.rect.x;
};

LNode.prototype.getRight = function ()
{
  return this.rect.x + this.rect.width;
};

LNode.prototype.getTop = function ()
{
  return this.rect.y;
};

LNode.prototype.getBottom = function ()
{
  return this.rect.y + this.rect.height;
};

LNode.prototype.getParent = function ()
{
  if (this.owner == null)
  {
    return null;
  }

  return this.owner.getParent();
};

module.exports = LNode;

},{"./HashSet":14,"./Integer":17,"./LGraphObject":21,"./LayoutConstants":24,"./PointD":26,"./RandomSeed":27,"./RectangleD":28}],23:[function(require,module,exports){
var LayoutConstants = require('./LayoutConstants');
var HashMap = require('./HashMap');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var LEdge = require('./LEdge');
var LGraph = require('./LGraph');
var PointD = require('./PointD');
var Transform = require('./Transform');
var Emitter = require('./Emitter');
var HashSet = require('./HashSet');

function Layout(isRemoteUse) {
  Emitter.call( this );

  //Layout Quality: 0:proof, 1:default, 2:draft
  this.layoutQuality = LayoutConstants.DEFAULT_QUALITY;
  //Whether layout should create bendpoints as needed or not
  this.createBendsAsNeeded =
          LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
  //Whether layout should be incremental or not
  this.incremental = LayoutConstants.DEFAULT_INCREMENTAL;
  //Whether we animate from before to after layout node positions
  this.animationOnLayout =
          LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
  //Whether we animate the layout process or not
  this.animationDuringLayout = LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT;
  //Number iterations that should be done between two successive animations
  this.animationPeriod = LayoutConstants.DEFAULT_ANIMATION_PERIOD;
  /**
   * Whether or not leaf nodes (non-compound nodes) are of uniform sizes. When
   * they are, both spring and repulsion forces between two leaf nodes can be
   * calculated without the expensive clipping point calculations, resulting
   * in major speed-up.
   */
  this.uniformLeafNodeSizes =
          LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;
  /**
   * This is used for creation of bendpoints by using dummy nodes and edges.
   * Maps an LEdge to its dummy bendpoint path.
   */
  this.edgeToDummyNodes = new HashMap();
  this.graphManager = new LGraphManager(this);
  this.isLayoutFinished = false;
  this.isSubLayout = false;
  this.isRemoteUse = false;

  if (isRemoteUse != null) {
    this.isRemoteUse = isRemoteUse;
  }
}

Layout.RANDOM_SEED = 1;

Layout.prototype = Object.create( Emitter.prototype );

Layout.prototype.getGraphManager = function () {
  return this.graphManager;
};

Layout.prototype.getAllNodes = function () {
  return this.graphManager.getAllNodes();
};

Layout.prototype.getAllEdges = function () {
  return this.graphManager.getAllEdges();
};

Layout.prototype.getAllNodesToApplyGravitation = function () {
  return this.graphManager.getAllNodesToApplyGravitation();
};

Layout.prototype.newGraphManager = function () {
  var gm = new LGraphManager(this);
  this.graphManager = gm;
  return gm;
};

Layout.prototype.newGraph = function (vGraph)
{
  return new LGraph(null, this.graphManager, vGraph);
};

Layout.prototype.newNode = function (vNode)
{
  return new LNode(this.graphManager, vNode);
};

Layout.prototype.newEdge = function (vEdge)
{
  return new LEdge(null, null, vEdge);
};

Layout.prototype.runLayout = function ()
{
  this.isLayoutFinished = false;
  
  if (this.tilingPreLayout) {
    this.tilingPreLayout();
  }

  this.initParameters();
  var isLayoutSuccessfull;

  if ((this.graphManager.getRoot() == null)
          || this.graphManager.getRoot().getNodes().length == 0
          || this.graphManager.includesInvalidEdge())
  {
    isLayoutSuccessfull = false;
  }
  else
  {
    // calculate execution time
    var startTime = 0;

    if (!this.isSubLayout)
    {
      startTime = new Date().getTime()
    }

    isLayoutSuccessfull = this.layout();

    if (!this.isSubLayout)
    {
      var endTime = new Date().getTime();
      var excTime = endTime - startTime;
    }
  }

  if (isLayoutSuccessfull)
  {
    if (!this.isSubLayout)
    {
      this.doPostLayout();
    }
  }

  if (this.tilingPostLayout) {
    this.tilingPostLayout();
  }

  this.isLayoutFinished = true;

  return isLayoutSuccessfull;
};

/**
 * This method performs the operations required after layout.
 */
Layout.prototype.doPostLayout = function ()
{
  //assert !isSubLayout : "Should not be called on sub-layout!";
  // Propagate geometric changes to v-level objects
  this.transform();
  this.update();
};

/**
 * This method updates the geometry of the target graph according to
 * calculated layout.
 */
Layout.prototype.update2 = function () {
  // update bend points
  if (this.createBendsAsNeeded)
  {
    this.createBendpointsFromDummyNodes();

    // reset all edges, since the topology has changed
    this.graphManager.resetAllEdges();
  }

  // perform edge, node and root updates if layout is not called
  // remotely
  if (!this.isRemoteUse)
  {
    // update all edges
    var edge;
    var allEdges = this.graphManager.getAllEdges();
    for (var i = 0; i < allEdges.length; i++)
    {
      edge = allEdges[i];
//      this.update(edge);
    }

    // recursively update nodes
    var node;
    var nodes = this.graphManager.getRoot().getNodes();
    for (var i = 0; i < nodes.length; i++)
    {
      node = nodes[i];
//      this.update(node);
    }

    // update root graph
    this.update(this.graphManager.getRoot());
  }
};

Layout.prototype.update = function (obj) {
  if (obj == null) {
    this.update2();
  }
  else if (obj instanceof LNode) {
    var node = obj;
    if (node.getChild() != null)
    {
      // since node is compound, recursively update child nodes
      var nodes = node.getChild().getNodes();
      for (var i = 0; i < nodes.length; i++)
      {
        update(nodes[i]);
      }
    }

    // if the l-level node is associated with a v-level graph object,
    // then it is assumed that the v-level node implements the
    // interface Updatable.
    if (node.vGraphObject != null)
    {
      // cast to Updatable without any type check
      var vNode = node.vGraphObject;

      // call the update method of the interface
      vNode.update(node);
    }
  }
  else if (obj instanceof LEdge) {
    var edge = obj;
    // if the l-level edge is associated with a v-level graph object,
    // then it is assumed that the v-level edge implements the
    // interface Updatable.

    if (edge.vGraphObject != null)
    {
      // cast to Updatable without any type check
      var vEdge = edge.vGraphObject;

      // call the update method of the interface
      vEdge.update(edge);
    }
  }
  else if (obj instanceof LGraph) {
    var graph = obj;
    // if the l-level graph is associated with a v-level graph object,
    // then it is assumed that the v-level object implements the
    // interface Updatable.

    if (graph.vGraphObject != null)
    {
      // cast to Updatable without any type check
      var vGraph = graph.vGraphObject;

      // call the update method of the interface
      vGraph.update(graph);
    }
  }
};

/**
 * This method is used to set all layout parameters to default values
 * determined at compile time.
 */
Layout.prototype.initParameters = function () {
  if (!this.isSubLayout)
  {
    this.layoutQuality = LayoutConstants.DEFAULT_QUALITY;
    this.animationDuringLayout = LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT;
    this.animationPeriod = LayoutConstants.DEFAULT_ANIMATION_PERIOD;
    this.animationOnLayout = LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT;
    this.incremental = LayoutConstants.DEFAULT_INCREMENTAL;
    this.createBendsAsNeeded = LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED;
    this.uniformLeafNodeSizes = LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES;
  }

  if (this.animationDuringLayout)
  {
    animationOnLayout = false;
  }
};

Layout.prototype.transform = function (newLeftTop) {
  if (newLeftTop == undefined) {
    this.transform(new PointD(0, 0));
  }
  else {
    // create a transformation object (from Eclipse to layout). When an
    // inverse transform is applied, we get upper-left coordinate of the
    // drawing or the root graph at given input coordinate (some margins
    // already included in calculation of left-top).

    var trans = new Transform();
    var leftTop = this.graphManager.getRoot().updateLeftTop();

    if (leftTop != null)
    {
      trans.setWorldOrgX(newLeftTop.x);
      trans.setWorldOrgY(newLeftTop.y);

      trans.setDeviceOrgX(leftTop.x);
      trans.setDeviceOrgY(leftTop.y);

      var nodes = this.getAllNodes();
      var node;

      for (var i = 0; i < nodes.length; i++)
      {
        node = nodes[i];
        node.transform(trans);
      }
    }
  }
};

Layout.prototype.positionNodesRandomly = function (graph) {

  if (graph == undefined) {
    //assert !this.incremental;
    this.positionNodesRandomly(this.getGraphManager().getRoot());
    this.getGraphManager().getRoot().updateBounds(true);
  }
  else {
    var lNode;
    var childGraph;

    var nodes = graph.getNodes();
    for (var i = 0; i < nodes.length; i++)
    {
      lNode = nodes[i];
      childGraph = lNode.getChild();

      if (childGraph == null)
      {
        lNode.scatter();
      }
      else if (childGraph.getNodes().length == 0)
      {
        lNode.scatter();
      }
      else
      {
        this.positionNodesRandomly(childGraph);
        lNode.updateBounds();
      }
    }
  }
};

/**
 * This method returns a list of trees where each tree is represented as a
 * list of l-nodes. The method returns a list of size 0 when:
 * - The graph is not flat or
 * - One of the component(s) of the graph is not a tree.
 */
Layout.prototype.getFlatForest = function ()
{
  var flatForest = [];
  var isForest = true;

  // Quick reference for all nodes in the graph manager associated with
  // this layout. The list should not be changed.
  var allNodes = this.graphManager.getRoot().getNodes();

  // First be sure that the graph is flat
  var isFlat = true;

  for (var i = 0; i < allNodes.length; i++)
  {
    if (allNodes[i].getChild() != null)
    {
      isFlat = false;
    }
  }

  // Return empty forest if the graph is not flat.
  if (!isFlat)
  {
    return flatForest;
  }

  // Run BFS for each component of the graph.

  var visited = new HashSet();
  var toBeVisited = [];
  var parents = new HashMap();
  var unProcessedNodes = [];

  unProcessedNodes = unProcessedNodes.concat(allNodes);

  // Each iteration of this loop finds a component of the graph and
  // decides whether it is a tree or not. If it is a tree, adds it to the
  // forest and continued with the next component.

  while (unProcessedNodes.length > 0 && isForest)
  {
    toBeVisited.push(unProcessedNodes[0]);

    // Start the BFS. Each iteration of this loop visits a node in a
    // BFS manner.
    while (toBeVisited.length > 0 && isForest)
    {
      //pool operation
      var currentNode = toBeVisited[0];
      toBeVisited.splice(0, 1);
      visited.add(currentNode);

      // Traverse all neighbors of this node
      var neighborEdges = currentNode.getEdges();

      for (var i = 0; i < neighborEdges.length; i++)
      {
        var currentNeighbor =
                neighborEdges[i].getOtherEnd(currentNode);

        // If BFS is not growing from this neighbor.
        if (parents.get(currentNode) != currentNeighbor)
        {
          // We haven't previously visited this neighbor.
          if (!visited.contains(currentNeighbor))
          {
            toBeVisited.push(currentNeighbor);
            parents.put(currentNeighbor, currentNode);
          }
          // Since we have previously visited this neighbor and
          // this neighbor is not parent of currentNode, given
          // graph contains a component that is not tree, hence
          // it is not a forest.
          else
          {
            isForest = false;
            break;
          }
        }
      }
    }

    // The graph contains a component that is not a tree. Empty
    // previously found trees. The method will end.
    if (!isForest)
    {
      flatForest = [];
    }
    // Save currently visited nodes as a tree in our forest. Reset
    // visited and parents lists. Continue with the next component of
    // the graph, if any.
    else
    {
      var temp = [];
      visited.addAllTo(temp);
      flatForest.push(temp);
      //flatForest = flatForest.concat(temp);
      //unProcessedNodes.removeAll(visited);
      for (var i = 0; i < temp.length; i++) {
        var value = temp[i];
        var index = unProcessedNodes.indexOf(value);
        if (index > -1) {
          unProcessedNodes.splice(index, 1);
        }
      }
      visited = new HashSet();
      parents = new HashMap();
    }
  }

  return flatForest;
};

/**
 * This method creates dummy nodes (an l-level node with minimal dimensions)
 * for the given edge (one per bendpoint). The existing l-level structure
 * is updated accordingly.
 */
Layout.prototype.createDummyNodesForBendpoints = function (edge)
{
  var dummyNodes = [];
  var prev = edge.source;

  var graph = this.graphManager.calcLowestCommonAncestor(edge.source, edge.target);

  for (var i = 0; i < edge.bendpoints.length; i++)
  {
    // create new dummy node
    var dummyNode = this.newNode(null);
    dummyNode.setRect(new Point(0, 0), new Dimension(1, 1));

    graph.add(dummyNode);

    // create new dummy edge between prev and dummy node
    var dummyEdge = this.newEdge(null);
    this.graphManager.add(dummyEdge, prev, dummyNode);

    dummyNodes.add(dummyNode);
    prev = dummyNode;
  }

  var dummyEdge = this.newEdge(null);
  this.graphManager.add(dummyEdge, prev, edge.target);

  this.edgeToDummyNodes.put(edge, dummyNodes);

  // remove real edge from graph manager if it is inter-graph
  if (edge.isInterGraph())
  {
    this.graphManager.remove(edge);
  }
  // else, remove the edge from the current graph
  else
  {
    graph.remove(edge);
  }

  return dummyNodes;
};

/**
 * This method creates bendpoints for edges from the dummy nodes
 * at l-level.
 */
Layout.prototype.createBendpointsFromDummyNodes = function ()
{
  var edges = [];
  edges = edges.concat(this.graphManager.getAllEdges());
  edges = this.edgeToDummyNodes.keySet().concat(edges);

  for (var k = 0; k < edges.length; k++)
  {
    var lEdge = edges[k];

    if (lEdge.bendpoints.length > 0)
    {
      var path = this.edgeToDummyNodes.get(lEdge);

      for (var i = 0; i < path.length; i++)
      {
        var dummyNode = path[i];
        var p = new PointD(dummyNode.getCenterX(),
                dummyNode.getCenterY());

        // update bendpoint's location according to dummy node
        var ebp = lEdge.bendpoints.get(i);
        ebp.x = p.x;
        ebp.y = p.y;

        // remove the dummy node, dummy edges incident with this
        // dummy node is also removed (within the remove method)
        dummyNode.getOwner().remove(dummyNode);
      }

      // add the real edge to graph
      this.graphManager.add(lEdge, lEdge.source, lEdge.target);
    }
  }
};

Layout.transform = function (sliderValue, defaultValue, minDiv, maxMul) {
  if (minDiv != undefined && maxMul != undefined) {
    var value = defaultValue;

    if (sliderValue <= 50)
    {
      var minValue = defaultValue / minDiv;
      value -= ((defaultValue - minValue) / 50) * (50 - sliderValue);
    }
    else
    {
      var maxValue = defaultValue * maxMul;
      value += ((maxValue - defaultValue) / 50) * (sliderValue - 50);
    }

    return value;
  }
  else {
    var a, b;

    if (sliderValue <= 50)
    {
      a = 9.0 * defaultValue / 500.0;
      b = defaultValue / 10.0;
    }
    else
    {
      a = 9.0 * defaultValue / 50.0;
      b = -8 * defaultValue;
    }

    return (a * sliderValue + b);
  }
};

/**
 * This method finds and returns the center of the given nodes, assuming
 * that the given nodes form a tree in themselves.
 */
Layout.findCenterOfTree = function (nodes)
{
  var list = [];
  list = list.concat(nodes);

  var removedNodes = [];
  var remainingDegrees = new HashMap();
  var foundCenter = false;
  var centerNode = null;

  if (list.length == 1 || list.length == 2)
  {
    foundCenter = true;
    centerNode = list[0];
  }

  for (var i = 0; i < list.length; i++)
  {
    var node = list[i];
    var degree = node.getNeighborsList().size();
    remainingDegrees.put(node, node.getNeighborsList().size());

    if (degree == 1)
    {
      removedNodes.push(node);
    }
  }

  var tempList = [];
  tempList = tempList.concat(removedNodes);

  while (!foundCenter)
  {
    var tempList2 = [];
    tempList2 = tempList2.concat(tempList);
    tempList = [];

    for (var i = 0; i < list.length; i++)
    {
      var node = list[i];

      var index = list.indexOf(node);
      if (index >= 0) {
        list.splice(index, 1);
      }

      var neighbours = node.getNeighborsList();

      Object.keys(neighbours.set).forEach(function(j) {
        var neighbour = neighbours.set[j];
        if (removedNodes.indexOf(neighbour) < 0)
        {
          var otherDegree = remainingDegrees.get(neighbour);
          var newDegree = otherDegree - 1;

          if (newDegree == 1)
          {
            tempList.push(neighbour);
          }

          remainingDegrees.put(neighbour, newDegree);
        }
      });
    }

    removedNodes = removedNodes.concat(tempList);

    if (list.length == 1 || list.length == 2)
    {
      foundCenter = true;
      centerNode = list[0];
    }
  }

  return centerNode;
};

/**
 * During the coarsening process, this layout may be referenced by two graph managers
 * this setter function grants access to change the currently being used graph manager
 */
Layout.prototype.setGraphManager = function (gm)
{
  this.graphManager = gm;
};

module.exports = Layout;

},{"./Emitter":8,"./HashMap":13,"./HashSet":14,"./LEdge":18,"./LGraph":19,"./LGraphManager":20,"./LNode":22,"./LayoutConstants":24,"./PointD":26,"./Transform":29}],24:[function(require,module,exports){
function LayoutConstants() {
}

/**
 * Layout Quality
 */
LayoutConstants.PROOF_QUALITY = 0;
LayoutConstants.DEFAULT_QUALITY = 1;
LayoutConstants.DRAFT_QUALITY = 2;

/**
 * Default parameters
 */
LayoutConstants.DEFAULT_CREATE_BENDS_AS_NEEDED = false;
//LayoutConstants.DEFAULT_INCREMENTAL = true;
LayoutConstants.DEFAULT_INCREMENTAL = false;
LayoutConstants.DEFAULT_ANIMATION_ON_LAYOUT = true;
LayoutConstants.DEFAULT_ANIMATION_DURING_LAYOUT = false;
LayoutConstants.DEFAULT_ANIMATION_PERIOD = 50;
LayoutConstants.DEFAULT_UNIFORM_LEAF_NODE_SIZES = false;

// -----------------------------------------------------------------------------
// Section: General other constants
// -----------------------------------------------------------------------------
/*
 * Margins of a graph to be applied on bouding rectangle of its contents. We
 * assume margins on all four sides to be uniform.
 */
LayoutConstants.DEFAULT_GRAPH_MARGIN = 15;

/*
 * Default dimension of a non-compound node.
 */
LayoutConstants.SIMPLE_NODE_SIZE = 40;

/*
 * Default dimension of a non-compound node.
 */
LayoutConstants.SIMPLE_NODE_HALF_SIZE = LayoutConstants.SIMPLE_NODE_SIZE / 2;

/*
 * Empty compound node size. When a compound node is empty, its both
 * dimensions should be of this value.
 */
LayoutConstants.EMPTY_COMPOUND_NODE_SIZE = 40;

/*
 * Minimum length that an edge should take during layout
 */
LayoutConstants.MIN_EDGE_LENGTH = 1;

/*
 * World boundaries that layout operates on
 */
LayoutConstants.WORLD_BOUNDARY = 1000000;

/*
 * World boundaries that random positioning can be performed with
 */
LayoutConstants.INITIAL_WORLD_BOUNDARY = LayoutConstants.WORLD_BOUNDARY / 1000;

/*
 * Coordinates of the world center
 */
LayoutConstants.WORLD_CENTER_X = 1200;
LayoutConstants.WORLD_CENTER_Y = 900;

module.exports = LayoutConstants;

},{}],25:[function(require,module,exports){
/*
 *This class is the javascript implementation of the Point.java class in jdk
 */
function Point(x, y, p) {
  this.x = null;
  this.y = null;
  if (x == null && y == null && p == null) {
    this.x = 0;
    this.y = 0;
  }
  else if (typeof x == 'number' && typeof y == 'number' && p == null) {
    this.x = x;
    this.y = y;
  }
  else if (x.constructor.name == 'Point' && y == null && p == null) {
    p = x;
    this.x = p.x;
    this.y = p.y;
  }
}

Point.prototype.getX = function () {
  return this.x;
}

Point.prototype.getY = function () {
  return this.y;
}

Point.prototype.getLocation = function () {
  return new Point(this.x, this.y);
}

Point.prototype.setLocation = function (x, y, p) {
  if (x.constructor.name == 'Point' && y == null && p == null) {
    p = x;
    this.setLocation(p.x, p.y);
  }
  else if (typeof x == 'number' && typeof y == 'number' && p == null) {
    //if both parameters are integer just move (x,y) location
    if (parseInt(x) == x && parseInt(y) == y) {
      this.move(x, y);
    }
    else {
      this.x = Math.floor(x + 0.5);
      this.y = Math.floor(y + 0.5);
    }
  }
}

Point.prototype.move = function (x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.translate = function (dx, dy) {
  this.x += dx;
  this.y += dy;
}

Point.prototype.equals = function (obj) {
  if (obj.constructor.name == "Point") {
    var pt = obj;
    return (this.x == pt.x) && (this.y == pt.y);
  }
  return this == obj;
}

Point.prototype.toString = function () {
  return new Point().constructor.name + "[x=" + this.x + ",y=" + this.y + "]";
}

module.exports = Point;

},{}],26:[function(require,module,exports){
function PointD(x, y) {
  if (x == null && y == null) {
    this.x = 0;
    this.y = 0;
  } else {
    this.x = x;
    this.y = y;
  }
}

PointD.prototype.getX = function ()
{
  return this.x;
};

PointD.prototype.getY = function ()
{
  return this.y;
};

PointD.prototype.setX = function (x)
{
  this.x = x;
};

PointD.prototype.setY = function (y)
{
  this.y = y;
};

PointD.prototype.getDifference = function (pt)
{
  return new DimensionD(this.x - pt.x, this.y - pt.y);
};

PointD.prototype.getCopy = function ()
{
  return new PointD(this.x, this.y);
};

PointD.prototype.translate = function (dim)
{
  this.x += dim.width;
  this.y += dim.height;
  return this;
};

module.exports = PointD;

},{}],27:[function(require,module,exports){
function RandomSeed() {
}
RandomSeed.seed = 1;
RandomSeed.x = 0;

RandomSeed.nextDouble = function () {
  RandomSeed.x = Math.sin(RandomSeed.seed++) * 10000;
  return RandomSeed.x - Math.floor(RandomSeed.x);
};

module.exports = RandomSeed;

},{}],28:[function(require,module,exports){
function RectangleD(x, y, width, height) {
  this.x = 0;
  this.y = 0;
  this.width = 0;
  this.height = 0;

  if (x != null && y != null && width != null && height != null) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

RectangleD.prototype.getX = function ()
{
  return this.x;
};

RectangleD.prototype.setX = function (x)
{
  this.x = x;
};

RectangleD.prototype.getY = function ()
{
  return this.y;
};

RectangleD.prototype.setY = function (y)
{
  this.y = y;
};

RectangleD.prototype.getWidth = function ()
{
  return this.width;
};

RectangleD.prototype.setWidth = function (width)
{
  this.width = width;
};

RectangleD.prototype.getHeight = function ()
{
  return this.height;
};

RectangleD.prototype.setHeight = function (height)
{
  this.height = height;
};

RectangleD.prototype.getRight = function ()
{
  return this.x + this.width;
};

RectangleD.prototype.getBottom = function ()
{
  return this.y + this.height;
};

RectangleD.prototype.intersects = function (a)
{
  if (this.getRight() < a.x)
  {
    return false;
  }

  if (this.getBottom() < a.y)
  {
    return false;
  }

  if (a.getRight() < this.x)
  {
    return false;
  }

  if (a.getBottom() < this.y)
  {
    return false;
  }

  return true;
};

RectangleD.prototype.getCenterX = function ()
{
  return this.x + this.width / 2;
};

RectangleD.prototype.getMinX = function ()
{
  return this.getX();
};

RectangleD.prototype.getMaxX = function ()
{
  return this.getX() + this.width;
};

RectangleD.prototype.getCenterY = function ()
{
  return this.y + this.height / 2;
};

RectangleD.prototype.getMinY = function ()
{
  return this.getY();
};

RectangleD.prototype.getMaxY = function ()
{
  return this.getY() + this.height;
};

RectangleD.prototype.getWidthHalf = function ()
{
  return this.width / 2;
};

RectangleD.prototype.getHeightHalf = function ()
{
  return this.height / 2;
};

module.exports = RectangleD;

},{}],29:[function(require,module,exports){
var PointD = require('./PointD');

function Transform(x, y) {
  this.lworldOrgX = 0.0;
  this.lworldOrgY = 0.0;
  this.ldeviceOrgX = 0.0;
  this.ldeviceOrgY = 0.0;
  this.lworldExtX = 1.0;
  this.lworldExtY = 1.0;
  this.ldeviceExtX = 1.0;
  this.ldeviceExtY = 1.0;
}

Transform.prototype.getWorldOrgX = function ()
{
  return this.lworldOrgX;
}

Transform.prototype.setWorldOrgX = function (wox)
{
  this.lworldOrgX = wox;
}

Transform.prototype.getWorldOrgY = function ()
{
  return this.lworldOrgY;
}

Transform.prototype.setWorldOrgY = function (woy)
{
  this.lworldOrgY = woy;
}

Transform.prototype.getWorldExtX = function ()
{
  return this.lworldExtX;
}

Transform.prototype.setWorldExtX = function (wex)
{
  this.lworldExtX = wex;
}

Transform.prototype.getWorldExtY = function ()
{
  return this.lworldExtY;
}

Transform.prototype.setWorldExtY = function (wey)
{
  this.lworldExtY = wey;
}

/* Device related */

Transform.prototype.getDeviceOrgX = function ()
{
  return this.ldeviceOrgX;
}

Transform.prototype.setDeviceOrgX = function (dox)
{
  this.ldeviceOrgX = dox;
}

Transform.prototype.getDeviceOrgY = function ()
{
  return this.ldeviceOrgY;
}

Transform.prototype.setDeviceOrgY = function (doy)
{
  this.ldeviceOrgY = doy;
}

Transform.prototype.getDeviceExtX = function ()
{
  return this.ldeviceExtX;
}

Transform.prototype.setDeviceExtX = function (dex)
{
  this.ldeviceExtX = dex;
}

Transform.prototype.getDeviceExtY = function ()
{
  return this.ldeviceExtY;
}

Transform.prototype.setDeviceExtY = function (dey)
{
  this.ldeviceExtY = dey;
}

Transform.prototype.transformX = function (x)
{
  var xDevice = 0.0;
  var worldExtX = this.lworldExtX;
  if (worldExtX != 0.0)
  {
    xDevice = this.ldeviceOrgX +
            ((x - this.lworldOrgX) * this.ldeviceExtX / worldExtX);
  }

  return xDevice;
}

Transform.prototype.transformY = function (y)
{
  var yDevice = 0.0;
  var worldExtY = this.lworldExtY;
  if (worldExtY != 0.0)
  {
    yDevice = this.ldeviceOrgY +
            ((y - this.lworldOrgY) * this.ldeviceExtY / worldExtY);
  }


  return yDevice;
}

Transform.prototype.inverseTransformX = function (x)
{
  var xWorld = 0.0;
  var deviceExtX = this.ldeviceExtX;
  if (deviceExtX != 0.0)
  {
    xWorld = this.lworldOrgX +
            ((x - this.ldeviceOrgX) * this.lworldExtX / deviceExtX);
  }


  return xWorld;
}

Transform.prototype.inverseTransformY = function (y)
{
  var yWorld = 0.0;
  var deviceExtY = this.ldeviceExtY;
  if (deviceExtY != 0.0)
  {
    yWorld = this.lworldOrgY +
            ((y - this.ldeviceOrgY) * this.lworldExtY / deviceExtY);
  }
  return yWorld;
}

Transform.prototype.inverseTransformPoint = function (inPoint)
{
  var outPoint =
          new PointD(this.inverseTransformX(inPoint.x),
                  this.inverseTransformY(inPoint.y));
  return outPoint;
}

module.exports = Transform;

},{"./PointD":26}],30:[function(require,module,exports){
function UniqueIDGeneretor() {
}

UniqueIDGeneretor.lastID = 0;

UniqueIDGeneretor.createID = function (obj) {
  if (UniqueIDGeneretor.isPrimitive(obj)) {
    return obj;
  }
  if (obj.uniqueID != null) {
    return obj.uniqueID;
  }
  obj.uniqueID = UniqueIDGeneretor.getString();
  UniqueIDGeneretor.lastID++;
  return obj.uniqueID;
}

UniqueIDGeneretor.getString = function (id) {
  if (id == null)
    id = UniqueIDGeneretor.lastID;
  return "Object#" + id + "";
}

UniqueIDGeneretor.isPrimitive = function (arg) {
  var type = typeof arg;
  return arg == null || (type != "object" && type != "function");
}

module.exports = UniqueIDGeneretor;

},{}],31:[function(require,module,exports){
'use strict';

var DimensionD = require('./DimensionD');
var HashMap = require('./HashMap');
var HashSet = require('./HashSet');
var IGeometry = require('./IGeometry');
var IMath = require('./IMath');
var Integer = require('./Integer');
var Point = require('./Point');
var PointD = require('./PointD');
var RandomSeed = require('./RandomSeed');
var RectangleD = require('./RectangleD');
var Transform = require('./Transform');
var UniqueIDGeneretor = require('./UniqueIDGeneretor');
var LGraphObject = require('./LGraphObject');
var LGraph = require('./LGraph');
var LEdge = require('./LEdge');
var LGraphManager = require('./LGraphManager');
var LNode = require('./LNode');
var Layout = require('./Layout');
var LayoutConstants = require('./LayoutConstants');
var FDLayout = require('./FDLayout');
var FDLayoutConstants = require('./FDLayoutConstants');
var FDLayoutEdge = require('./FDLayoutEdge');
var FDLayoutNode = require('./FDLayoutNode');
var CoSEConstants = require('./CoSEConstants');
var CoSEEdge = require('./CoSEEdge');
var CoSEGraph = require('./CoSEGraph');
var CoSEGraphManager = require('./CoSEGraphManager');
var CoSELayout = require('./CoSELayout');
var CoSENode = require('./CoSENode');

var defaults = {
  // Called on `layoutready`
  ready: function () {
  },
  // Called on `layoutstop`
  stop: function () {
  },
  // number of ticks per frame; higher is faster but more jerky
  refresh: 30,
  // Whether to fit the network view after when done
  fit: true,
  // Padding on fit
  padding: 10,
  // Padding for compounds
  paddingCompound: 15,
  // Whether to enable incremental mode
  randomize: true,
  // Node repulsion (non overlapping) multiplier
  nodeRepulsion: 4500,
  // Ideal edge (non nested) length
  idealEdgeLength: 50,
  // Divisor to compute edge forces
  edgeElasticity: 0.45,
  // Nesting factor (multiplier) to compute ideal edge length for nested edges
  nestingFactor: 0.1,
  // Gravity force (constant)
  gravity: 0.25,
  // Maximum number of iterations to perform
  numIter: 2500,
  // For enabling tiling
  tile: true,
  // Type of layout animation. The option set is {'during', 'end', false}
  animate: 'end',
  // Duration for animate:end
  animationDuration: 500,
  // Represents the amount of the vertical space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingVertical: 10,
  // Represents the amount of the horizontal space to put between the zero degree members during the tiling operation(can also be a function)
  tilingPaddingHorizontal: 10,
  // Gravity range (constant) for compounds
  gravityRangeCompound: 1.5,
  // Gravity force (constant) for compounds
  gravityCompound: 1.0,
  // Gravity range (constant)
  gravityRange: 3.8
};

function extend(defaults, options) {
  var obj = {};

  for (var i in defaults) {
    obj[i] = defaults[i];
  }

  for (var i in options) {
    obj[i] = options[i];
  }

  return obj;
};

function _CoSELayout(_options) {
//  TilingExtension(this); // Extend this instance with tiling functions
  this.options = extend(defaults, _options);
  getUserOptions(this.options);
}

var getUserOptions = function (options) {
  if (options.nodeRepulsion != null)
    CoSEConstants.DEFAULT_REPULSION_STRENGTH = FDLayoutConstants.DEFAULT_REPULSION_STRENGTH = options.nodeRepulsion;
  if (options.idealEdgeLength != null)
    CoSEConstants.DEFAULT_EDGE_LENGTH = FDLayoutConstants.DEFAULT_EDGE_LENGTH = options.idealEdgeLength;
  if (options.edgeElasticity != null)
    CoSEConstants.DEFAULT_SPRING_STRENGTH = FDLayoutConstants.DEFAULT_SPRING_STRENGTH = options.edgeElasticity;
  if (options.nestingFactor != null)
    CoSEConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = FDLayoutConstants.PER_LEVEL_IDEAL_EDGE_LENGTH_FACTOR = options.nestingFactor;
  if (options.gravity != null)
    CoSEConstants.DEFAULT_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_GRAVITY_STRENGTH = options.gravity;
  if (options.numIter != null)
    CoSEConstants.MAX_ITERATIONS = FDLayoutConstants.MAX_ITERATIONS = options.numIter;
  if (options.paddingCompound != null)
    CoSEConstants.DEFAULT_GRAPH_MARGIN = FDLayoutConstants.DEFAULT_GRAPH_MARGIN = LayoutConstants.DEFAULT_GRAPH_MARGIN = options.paddingCompound;
  if (options.gravityRange != null)
    CoSEConstants.DEFAULT_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_GRAVITY_RANGE_FACTOR = options.gravityRange;
  if(options.gravityCompound != null)
    CoSEConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_STRENGTH = options.gravityCompound;
  if(options.gravityRangeCompound != null)
    CoSEConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = FDLayoutConstants.DEFAULT_COMPOUND_GRAVITY_RANGE_FACTOR = options.gravityRangeCompound;

  CoSEConstants.DEFAULT_INCREMENTAL = FDLayoutConstants.DEFAULT_INCREMENTAL = LayoutConstants.DEFAULT_INCREMENTAL =
          !(options.randomize);
  CoSEConstants.ANIMATE = FDLayoutConstants.ANIMATE = options.animate;
  CoSEConstants.TILE = options.tile;
  CoSEConstants.TILING_PADDING_VERTICAL = 
          typeof options.tilingPaddingVertical === 'function' ? options.tilingPaddingVertical.call() : options.tilingPaddingVertical;
  CoSEConstants.TILING_PADDING_HORIZONTAL = 
          typeof options.tilingPaddingHorizontal === 'function' ? options.tilingPaddingHorizontal.call() : options.tilingPaddingHorizontal;
};

_CoSELayout.prototype.run = function () {
  var ready;
  var frameId;
  var options = this.options;
  var idToLNode = this.idToLNode = {};
  var layout = this.layout = new CoSELayout();
  var self = this;
  
  this.cy = this.options.cy;

  this.cy.trigger({ type: 'layoutstart', layout: this });

  var gm = layout.newGraphManager();
  this.gm = gm;

  var nodes = this.options.eles.nodes();
  var edges = this.options.eles.edges();

  this.root = gm.addRoot();
  this.processChildrenList(this.root, this.getTopMostNodes(nodes), layout);


  for (var i = 0; i < edges.length; i++) {
    var edge = edges[i];
    var sourceNode = this.idToLNode[edge.data("source")];
    var targetNode = this.idToLNode[edge.data("target")];
    var e1 = gm.add(layout.newEdge(), sourceNode, targetNode);
    e1.id = edge.id();
  }
  
   var getPositions = function(ele, i){
    if(typeof ele === "number") {
      ele = i;
    }
    var theId = ele.data('id');
    var lNode = self.idToLNode[theId];

    return {
      x: lNode.getRect().getCenterX(),
      y: lNode.getRect().getCenterY()
    };
  };
  
  /*
   * Reposition nodes in iterations animatedly
   */
  var iterateAnimated = function () {
    // Thigs to perform after nodes are repositioned on screen
    var afterReposition = function() {
      if (options.fit) {
        options.cy.fit(options.eles.nodes(), options.padding);
      }

      if (!ready) {
        ready = true;
        self.cy.one('layoutready', options.ready);
        self.cy.trigger({type: 'layoutready', layout: self});
      }
    };
    
    var ticksPerFrame = self.options.refresh;
    var isDone;

    for( var i = 0; i < ticksPerFrame && !isDone; i++ ){
      isDone = self.layout.tick();
    }
    
    // If layout is done
    if (isDone) {
      self.options.eles.nodes().positions(getPositions);
      
      afterReposition();
      
      // trigger layoutstop when the layout stops (e.g. finishes)
      self.cy.one('layoutstop', self.options.stop);
      self.cy.trigger('layoutstop');
      self.cy.trigger({ type: 'layoutstop', layout: self });

      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      
      self.options.eles.nodes().removeScratch('coseBilkent');
      ready = false;
      return;
    }
    
    var animationData = self.layout.getPositionsData(); // Get positions of layout nodes note that all nodes may not be layout nodes because of tiling
    
    // Position nodes, for the nodes whose id does not included in data (because they are removed from their parents and included in dummy compounds)
    // use position of their ancestors or dummy ancestors
    options.eles.nodes().positions(function (ele, i) {
      if (typeof ele === "number") {
        ele = i;
      }
      var theId = ele.id();
      var pNode = animationData[theId];
      var temp = ele;
      // If pNode is undefined search until finding position data of its first ancestor (It may be dummy as well)
      while (pNode == null) {
        pNode = animationData[temp.data('parent')] || animationData['DummyCompound_' + temp.data('parent')];
        animationData[theId] = pNode;
        temp = temp.parent()[0];
      }
      return {
        x: pNode.x,
        y: pNode.y
      };
    });

    afterReposition();

    frameId = requestAnimationFrame(iterateAnimated);
  };
  
  /*
  * Listen 'layoutstarted' event and start animated iteration if animate option is 'during'
  */
  layout.addListener('layoutstarted', function () {
    if (self.options.animate === 'during') {
      frameId = requestAnimationFrame(iterateAnimated);
    }
  });
  
  layout.runLayout(); // Run cose layout
  
  /*
   * If animate option is not 'during' ('end' or false) perform these here (If it is 'during' similar things are already performed)
   */
  if(this.options.animate !== 'during'){
    setTimeout(function() {
      self.options.eles.nodes().not(":parent").layoutPositions(self, self.options, getPositions); // Use layout positions to reposition the nodes it considers the options parameter
      self.options.eles.nodes().removeScratch('coseBilkent');
      ready = false;
    }, 0);
    
  }

  return this; // chaining
};

//Get the top most ones of a list of nodes
_CoSELayout.prototype.getTopMostNodes = function(nodes) {
  var nodesMap = {};
  for (var i = 0; i < nodes.length; i++) {
      nodesMap[nodes[i].id()] = true;
  }
  var roots = nodes.filter(function (ele, i) {
      if(typeof ele === "number") {
        ele = i;
      }
      var parent = ele.parent()[0];
      while(parent != null){
        if(nodesMap[parent.id()]){
          return false;
        }
        parent = parent.parent()[0];
      }
      return true;
  });

  return roots;
};

_CoSELayout.prototype.processChildrenList = function (parent, children, layout) {
  var size = children.length;
  for (var i = 0; i < size; i++) {
    var theChild = children[i];
    this.options.eles.nodes().length;
    var children_of_children = theChild.children();
    var theNode;

    if (theChild.width() != null
            && theChild.height() != null) {
      theNode = parent.add(new CoSENode(layout.graphManager,
              new PointD(theChild.position('x') - theChild.width() / 2, theChild.position('y') - theChild.height() / 2),
              new DimensionD(parseFloat(theChild.width()),
                      parseFloat(theChild.height()))));
    }
    else {
      theNode = parent.add(new CoSENode(this.graphManager));
    }
    // Attach id to the layout node
    theNode.id = theChild.data("id");
    // Attach the paddings of cy node to layout node
    theNode.paddingLeft = parseInt( theChild.css('padding-left') );
    theNode.paddingTop = parseInt( theChild.css('padding-top') );
    theNode.paddingRight = parseInt( theChild.css('padding-right') );
    theNode.paddingBottom = parseInt( theChild.css('padding-bottom') );
    // Map the layout node
    this.idToLNode[theChild.data("id")] = theNode;

    if (isNaN(theNode.rect.x)) {
      theNode.rect.x = 0;
    }

    if (isNaN(theNode.rect.y)) {
      theNode.rect.y = 0;
    }

    if (children_of_children != null && children_of_children.length > 0) {
      var theNewGraph;
      theNewGraph = layout.getGraphManager().add(layout.newGraph(), theNode);
      this.processChildrenList(theNewGraph, children_of_children, layout);
    }
  }
};

/**
 * @brief : called on continuous layouts to stop them before they finish
 */
_CoSELayout.prototype.stop = function () {
  this.stopped = true;
  
  this.trigger('layoutstop');

  return this; // chaining
};

module.exports = function get(cytoscape) {
  return _CoSELayout;
};

},{"./CoSEConstants":1,"./CoSEEdge":2,"./CoSEGraph":3,"./CoSEGraphManager":4,"./CoSELayout":5,"./CoSENode":6,"./DimensionD":7,"./FDLayout":9,"./FDLayoutConstants":10,"./FDLayoutEdge":11,"./FDLayoutNode":12,"./HashMap":13,"./HashSet":14,"./IGeometry":15,"./IMath":16,"./Integer":17,"./LEdge":18,"./LGraph":19,"./LGraphManager":20,"./LGraphObject":21,"./LNode":22,"./Layout":23,"./LayoutConstants":24,"./Point":25,"./PointD":26,"./RandomSeed":27,"./RectangleD":28,"./Transform":29,"./UniqueIDGeneretor":30}],32:[function(require,module,exports){
'use strict';

// registers the extension on a cytoscape lib ref
var getLayout = require('./Layout');

var register = function( cytoscape ){
  var Layout = getLayout( cytoscape );

  cytoscape('layout', 'cose-bilkent', Layout);
};

// auto reg for globals
if( typeof cytoscape !== 'undefined' ){
  register( cytoscape );
}

module.exports = register;

},{"./Layout":31}]},{},[32])(32)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvTGF5b3V0L0NvU0VDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0NvU0VFZGdlLmpzIiwic3JjL0xheW91dC9Db1NFR3JhcGguanMiLCJzcmMvTGF5b3V0L0NvU0VHcmFwaE1hbmFnZXIuanMiLCJzcmMvTGF5b3V0L0NvU0VMYXlvdXQuanMiLCJzcmMvTGF5b3V0L0NvU0VOb2RlLmpzIiwic3JjL0xheW91dC9EaW1lbnNpb25ELmpzIiwic3JjL0xheW91dC9FbWl0dGVyLmpzIiwic3JjL0xheW91dC9GRExheW91dC5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXRDb25zdGFudHMuanMiLCJzcmMvTGF5b3V0L0ZETGF5b3V0RWRnZS5qcyIsInNyYy9MYXlvdXQvRkRMYXlvdXROb2RlLmpzIiwic3JjL0xheW91dC9IYXNoTWFwLmpzIiwic3JjL0xheW91dC9IYXNoU2V0LmpzIiwic3JjL0xheW91dC9JR2VvbWV0cnkuanMiLCJzcmMvTGF5b3V0L0lNYXRoLmpzIiwic3JjL0xheW91dC9JbnRlZ2VyLmpzIiwic3JjL0xheW91dC9MRWRnZS5qcyIsInNyYy9MYXlvdXQvTEdyYXBoLmpzIiwic3JjL0xheW91dC9MR3JhcGhNYW5hZ2VyLmpzIiwic3JjL0xheW91dC9MR3JhcGhPYmplY3QuanMiLCJzcmMvTGF5b3V0L0xOb2RlLmpzIiwic3JjL0xheW91dC9MYXlvdXQuanMiLCJzcmMvTGF5b3V0L0xheW91dENvbnN0YW50cy5qcyIsInNyYy9MYXlvdXQvUG9pbnQuanMiLCJzcmMvTGF5b3V0L1BvaW50RC5qcyIsInNyYy9MYXlvdXQvUmFuZG9tU2VlZC5qcyIsInNyYy9MYXlvdXQvUmVjdGFuZ2xlRC5qcyIsInNyYy9MYXlvdXQvVHJhbnNmb3JtLmpzIiwic3JjL0xheW91dC9VbmlxdWVJREdlbmVyZXRvci5qcyIsInNyYy9MYXlvdXQvaW5kZXguanMiLCJzcmMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzE2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Y0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUNvbnN0YW50cygpIHtcclxufVxyXG5cclxuLy9Db1NFQ29uc3RhbnRzIGluaGVyaXRzIHN0YXRpYyBwcm9wcyBpbiBGRExheW91dENvbnN0YW50c1xyXG5mb3IgKHZhciBwcm9wIGluIEZETGF5b3V0Q29uc3RhbnRzKSB7XHJcbiAgQ29TRUNvbnN0YW50c1twcm9wXSA9IEZETGF5b3V0Q29uc3RhbnRzW3Byb3BdO1xyXG59XHJcblxyXG5Db1NFQ29uc3RhbnRzLkRFRkFVTFRfVVNFX01VTFRJX0xFVkVMX1NDQUxJTkcgPSBmYWxzZTtcclxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX1JBRElBTF9TRVBBUkFUSU9OID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxuQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPTkVOVF9TRVBFUkFUSU9OID0gNjA7XHJcbkNvU0VDb25zdGFudHMuVElMRSA9IHRydWU7XHJcbkNvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfVkVSVElDQUwgPSAxMDtcclxuQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19IT1JJWk9OVEFMID0gMTA7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VDb25zdGFudHM7XHJcbiIsInZhciBGRExheW91dEVkZ2UgPSByZXF1aXJlKCcuL0ZETGF5b3V0RWRnZScpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUVkZ2Uoc291cmNlLCB0YXJnZXQsIHZFZGdlKSB7XHJcbiAgRkRMYXlvdXRFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcclxufVxyXG5cclxuQ29TRUVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShGRExheW91dEVkZ2UucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBGRExheW91dEVkZ2UpIHtcclxuICBDb1NFRWRnZVtwcm9wXSA9IEZETGF5b3V0RWRnZVtwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFRWRnZVxyXG4iLCJ2YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcclxuXHJcbmZ1bmN0aW9uIENvU0VHcmFwaChwYXJlbnQsIGdyYXBoTWdyLCB2R3JhcGgpIHtcclxuICBMR3JhcGguY2FsbCh0aGlzLCBwYXJlbnQsIGdyYXBoTWdyLCB2R3JhcGgpO1xyXG59XHJcblxyXG5Db1NFR3JhcGgucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGgucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGgpIHtcclxuICBDb1NFR3JhcGhbcHJvcF0gPSBMR3JhcGhbcHJvcF07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRUdyYXBoO1xyXG4iLCJ2YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUdyYXBoTWFuYWdlcihsYXlvdXQpIHtcclxuICBMR3JhcGhNYW5hZ2VyLmNhbGwodGhpcywgbGF5b3V0KTtcclxufVxyXG5cclxuQ29TRUdyYXBoTWFuYWdlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExHcmFwaE1hbmFnZXIucHJvdG90eXBlKTtcclxuZm9yICh2YXIgcHJvcCBpbiBMR3JhcGhNYW5hZ2VyKSB7XHJcbiAgQ29TRUdyYXBoTWFuYWdlcltwcm9wXSA9IExHcmFwaE1hbmFnZXJbcHJvcF07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29TRUdyYXBoTWFuYWdlcjtcclxuIiwidmFyIEZETGF5b3V0ID0gcmVxdWlyZSgnLi9GRExheW91dCcpO1xyXG52YXIgQ29TRUdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vQ29TRUdyYXBoTWFuYWdlcicpO1xyXG52YXIgQ29TRUdyYXBoID0gcmVxdWlyZSgnLi9Db1NFR3JhcGgnKTtcclxudmFyIENvU0VOb2RlID0gcmVxdWlyZSgnLi9Db1NFTm9kZScpO1xyXG52YXIgQ29TRUVkZ2UgPSByZXF1aXJlKCcuL0NvU0VFZGdlJyk7XHJcbnZhciBDb1NFQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9Db1NFQ29uc3RhbnRzJyk7XHJcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vUG9pbnQnKTtcclxudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XHJcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgSUdlb21ldHJ5ID0gcmVxdWlyZSgnLi9JR2VvbWV0cnknKTtcclxudmFyIExHcmFwaCA9IHJlcXVpcmUoJy4vTEdyYXBoJyk7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpO1xyXG5cclxuZnVuY3Rpb24gQ29TRUxheW91dCgpIHtcclxuICBGRExheW91dC5jYWxsKHRoaXMpO1xyXG4gIFxyXG4gIHRoaXMudG9CZVRpbGVkID0ge307IC8vIE1lbW9yaXplIGlmIGEgbm9kZSBpcyB0byBiZSB0aWxlZCBvciBpcyB0aWxlZFxyXG59XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRkRMYXlvdXQucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXQpIHtcclxuICBDb1NFTGF5b3V0W3Byb3BdID0gRkRMYXlvdXRbcHJvcF07XHJcbn1cclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZ20gPSBuZXcgQ29TRUdyYXBoTWFuYWdlcih0aGlzKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xyXG4gIHJldHVybiBnbTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoID0gZnVuY3Rpb24gKHZHcmFwaCkge1xyXG4gIHJldHVybiBuZXcgQ29TRUdyYXBoKG51bGwsIHRoaXMuZ3JhcGhNYW5hZ2VyLCB2R3JhcGgpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUubmV3Tm9kZSA9IGZ1bmN0aW9uICh2Tm9kZSkge1xyXG4gIHJldHVybiBuZXcgQ29TRU5vZGUodGhpcy5ncmFwaE1hbmFnZXIsIHZOb2RlKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLm5ld0VkZ2UgPSBmdW5jdGlvbiAodkVkZ2UpIHtcclxuICByZXR1cm4gbmV3IENvU0VFZGdlKG51bGwsIG51bGwsIHZFZGdlKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gIEZETGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycy5jYWxsKHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KSB7XHJcbiAgICBpZiAoQ29TRUNvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIIDwgMTApXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gMTA7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuaWRlYWxFZGdlTGVuZ3RoID0gQ29TRUNvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudXNlU21hcnRJZGVhbEVkZ2VMZW5ndGhDYWxjdWxhdGlvbiA9XHJcbiAgICAgICAgICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT047XHJcbiAgICB0aGlzLnNwcmluZ0NvbnN0YW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEg7XHJcbiAgICB0aGlzLnJlcHVsc2lvbkNvbnN0YW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEg7XHJcbiAgICB0aGlzLmdyYXZpdHlDb25zdGFudCA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9TVFJFTkdUSDtcclxuICAgIHRoaXMuY29tcG91bmRHcmF2aXR5Q29uc3RhbnQgPVxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEg7XHJcbiAgICB0aGlzLmdyYXZpdHlSYW5nZUZhY3RvciA9XHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XHJcbiAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eVJhbmdlRmFjdG9yID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUjtcclxuICB9XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5sYXlvdXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGNyZWF0ZUJlbmRzQXNOZWVkZWQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEO1xyXG4gIGlmIChjcmVhdGVCZW5kc0FzTmVlZGVkKVxyXG4gIHtcclxuICAgIHRoaXMuY3JlYXRlQmVuZHBvaW50cygpO1xyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIucmVzZXRBbGxFZGdlcygpO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5sZXZlbCA9IDA7XHJcbiAgcmV0dXJuIHRoaXMuY2xhc3NpY0xheW91dCgpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY2xhc3NpY0xheW91dCA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmNhbGN1bGF0ZU5vZGVzVG9BcHBseUdyYXZpdGF0aW9uVG8oKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlci5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3JzKCk7XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMoKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkuY2FsY0VzdGltYXRlZFNpemUoKTtcclxuICB0aGlzLmNhbGNJZGVhbEVkZ2VMZW5ndGhzKCk7XHJcbiAgaWYgKCF0aGlzLmluY3JlbWVudGFsKVxyXG4gIHtcclxuICAgIHZhciBmb3Jlc3QgPSB0aGlzLmdldEZsYXRGb3Jlc3QoKTtcclxuXHJcbiAgICAvLyBUaGUgZ3JhcGggYXNzb2NpYXRlZCB3aXRoIHRoaXMgbGF5b3V0IGlzIGZsYXQgYW5kIGEgZm9yZXN0XHJcbiAgICBpZiAoZm9yZXN0Lmxlbmd0aCA+IDApXHJcblxyXG4gICAge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYWRpYWxseShmb3Jlc3QpO1xyXG4gICAgfVxyXG4gICAgLy8gVGhlIGdyYXBoIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGxheW91dCBpcyBub3QgZmxhdCBvciBhIGZvcmVzdFxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seSgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhpcy5pbml0U3ByaW5nRW1iZWRkZXIoKTtcclxuICB0aGlzLnJ1blNwcmluZ0VtYmVkZGVyKCk7XHJcblxyXG4gIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUudGljayA9IGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMudG90YWxJdGVyYXRpb25zKys7XHJcbiAgXHJcbiAgaWYgKHRoaXMudG90YWxJdGVyYXRpb25zID09PSB0aGlzLm1heEl0ZXJhdGlvbnMpIHtcclxuICAgIHJldHVybiB0cnVlOyAvLyBMYXlvdXQgaXMgbm90IGVuZGVkIHJldHVybiB0cnVlXHJcbiAgfVxyXG4gIFxyXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyAlIEZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9PSAwKVxyXG4gIHtcclxuICAgIGlmICh0aGlzLmlzQ29udmVyZ2VkKCkpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiB0cnVlOyAvLyBMYXlvdXQgaXMgbm90IGVuZGVkIHJldHVybiB0cnVlXHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5jb29saW5nRmFjdG9yID0gdGhpcy5pbml0aWFsQ29vbGluZ0ZhY3RvciAqXHJcbiAgICAgICAgICAgICgodGhpcy5tYXhJdGVyYXRpb25zIC0gdGhpcy50b3RhbEl0ZXJhdGlvbnMpIC8gdGhpcy5tYXhJdGVyYXRpb25zKTtcclxuICAgIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTWF0aC5jZWlsKHRoaXMuaW5pdGlhbEFuaW1hdGlvblBlcmlvZCAqIE1hdGguc3FydCh0aGlzLmNvb2xpbmdGYWN0b3IpKTtcclxuXHJcbiAgfVxyXG4gIHRoaXMudG90YWxEaXNwbGFjZW1lbnQgPSAwO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLnVwZGF0ZUJvdW5kcygpO1xyXG4gIHRoaXMuY2FsY1NwcmluZ0ZvcmNlcygpO1xyXG4gIHRoaXMuY2FsY1JlcHVsc2lvbkZvcmNlcygpO1xyXG4gIHRoaXMuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZXMoKTtcclxuICB0aGlzLm1vdmVOb2RlcygpO1xyXG4gIHRoaXMuYW5pbWF0ZSgpO1xyXG4gIFxyXG4gIHJldHVybiBmYWxzZTsgLy8gTGF5b3V0IGlzIG5vdCBlbmRlZCB5ZXQgcmV0dXJuIGZhbHNlXHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRQb3NpdGlvbnNEYXRhID0gZnVuY3Rpb24oKSB7XHJcbiAgdmFyIGFsbE5vZGVzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsTm9kZXMoKTtcclxuICB2YXIgcERhdGEgPSB7fTtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgcmVjdCA9IGFsbE5vZGVzW2ldLnJlY3Q7XHJcbiAgICB2YXIgaWQgPSBhbGxOb2Rlc1tpXS5pZDtcclxuICAgIHBEYXRhW2lkXSA9IHtcclxuICAgICAgaWQ6IGlkLFxyXG4gICAgICB4OiByZWN0LmdldENlbnRlclgoKSxcclxuICAgICAgeTogcmVjdC5nZXRDZW50ZXJZKCksXHJcbiAgICAgIHc6IHJlY3Qud2lkdGgsXHJcbiAgICAgIGg6IHJlY3QuaGVpZ2h0XHJcbiAgICB9O1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gcERhdGE7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5ydW5TcHJpbmdFbWJlZGRlciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmluaXRpYWxBbmltYXRpb25QZXJpb2QgPSAyNTtcclxuICB0aGlzLmFuaW1hdGlvblBlcmlvZCA9IHRoaXMuaW5pdGlhbEFuaW1hdGlvblBlcmlvZDtcclxuICB2YXIgbGF5b3V0RW5kZWQgPSBmYWxzZTtcclxuICBcclxuICAvLyBJZiBhbWluYXRlIG9wdGlvbiBpcyAnZHVyaW5nJyBzaWduYWwgdGhhdCBsYXlvdXQgaXMgc3VwcG9zZWQgdG8gc3RhcnQgaXRlcmF0aW5nXHJcbiAgaWYgKCBGRExheW91dENvbnN0YW50cy5BTklNQVRFID09PSAnZHVyaW5nJyApIHtcclxuICAgIHRoaXMuZW1pdCgnbGF5b3V0c3RhcnRlZCcpO1xyXG4gIH1cclxuICBlbHNlIHtcclxuICAgIC8vIElmIGFtaW5hdGUgb3B0aW9uIGlzICdkdXJpbmcnIHRpY2soKSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBvbiBpbmRleC5qc1xyXG4gICAgd2hpbGUgKCFsYXlvdXRFbmRlZCkge1xyXG4gICAgICBsYXlvdXRFbmRlZCA9IHRoaXMudGljaygpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnVwZGF0ZUJvdW5kcygpO1xyXG4gIH1cclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmNhbGN1bGF0ZU5vZGVzVG9BcHBseUdyYXZpdGF0aW9uVG8gPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG5vZGVMaXN0ID0gW107XHJcbiAgdmFyIGdyYXBoO1xyXG5cclxuICB2YXIgZ3JhcGhzID0gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0R3JhcGhzKCk7XHJcbiAgdmFyIHNpemUgPSBncmFwaHMubGVuZ3RoO1xyXG4gIHZhciBpO1xyXG4gIGZvciAoaSA9IDA7IGkgPCBzaXplOyBpKyspXHJcbiAge1xyXG4gICAgZ3JhcGggPSBncmFwaHNbaV07XHJcblxyXG4gICAgZ3JhcGgudXBkYXRlQ29ubmVjdGVkKCk7XHJcblxyXG4gICAgaWYgKCFncmFwaC5pc0Nvbm5lY3RlZClcclxuICAgIHtcclxuICAgICAgbm9kZUxpc3QgPSBub2RlTGlzdC5jb25jYXQoZ3JhcGguZ2V0Tm9kZXMoKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0aGlzLmdyYXBoTWFuYWdlci5zZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbihub2RlTGlzdCk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jcmVhdGVCZW5kcG9pbnRzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBlZGdlcyA9IFtdO1xyXG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xyXG4gIHZhciB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcclxuICB2YXIgaTtcclxuICBmb3IgKGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcclxuXHJcbiAgICBpZiAoIXZpc2l0ZWQuY29udGFpbnMoZWRnZSkpXHJcbiAgICB7XHJcbiAgICAgIHZhciBzb3VyY2UgPSBlZGdlLmdldFNvdXJjZSgpO1xyXG4gICAgICB2YXIgdGFyZ2V0ID0gZWRnZS5nZXRUYXJnZXQoKTtcclxuXHJcbiAgICAgIGlmIChzb3VyY2UgPT0gdGFyZ2V0KVxyXG4gICAgICB7XHJcbiAgICAgICAgZWRnZS5nZXRCZW5kcG9pbnRzKCkucHVzaChuZXcgUG9pbnREKCkpO1xyXG4gICAgICAgIGVkZ2UuZ2V0QmVuZHBvaW50cygpLnB1c2gobmV3IFBvaW50RCgpKTtcclxuICAgICAgICB0aGlzLmNyZWF0ZUR1bW15Tm9kZXNGb3JCZW5kcG9pbnRzKGVkZ2UpO1xyXG4gICAgICAgIHZpc2l0ZWQuYWRkKGVkZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIHZhciBlZGdlTGlzdCA9IFtdO1xyXG5cclxuICAgICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdChzb3VyY2UuZ2V0RWRnZUxpc3RUb05vZGUodGFyZ2V0KSk7XHJcbiAgICAgICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGFyZ2V0LmdldEVkZ2VMaXN0VG9Ob2RlKHNvdXJjZSkpO1xyXG5cclxuICAgICAgICBpZiAoIXZpc2l0ZWQuY29udGFpbnMoZWRnZUxpc3RbMF0pKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlmIChlZGdlTGlzdC5sZW5ndGggPiAxKVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgaztcclxuICAgICAgICAgICAgZm9yIChrID0gMDsgayA8IGVkZ2VMaXN0Lmxlbmd0aDsgaysrKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgdmFyIG11bHRpRWRnZSA9IGVkZ2VMaXN0W2tdO1xyXG4gICAgICAgICAgICAgIG11bHRpRWRnZS5nZXRCZW5kcG9pbnRzKCkucHVzaChuZXcgUG9pbnREKCkpO1xyXG4gICAgICAgICAgICAgIHRoaXMuY3JlYXRlRHVtbXlOb2Rlc0ZvckJlbmRwb2ludHMobXVsdGlFZGdlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmlzaXRlZC5hZGRBbGwobGlzdCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHZpc2l0ZWQuc2l6ZSgpID09IGVkZ2VzLmxlbmd0aClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUucG9zaXRpb25Ob2Rlc1JhZGlhbGx5ID0gZnVuY3Rpb24gKGZvcmVzdCkge1xyXG4gIC8vIFdlIHRpbGUgdGhlIHRyZWVzIHRvIGEgZ3JpZCByb3cgYnkgcm93OyBmaXJzdCB0cmVlIHN0YXJ0cyBhdCAoMCwwKVxyXG4gIHZhciBjdXJyZW50U3RhcnRpbmdQb2ludCA9IG5ldyBQb2ludCgwLCAwKTtcclxuICB2YXIgbnVtYmVyT2ZDb2x1bW5zID0gTWF0aC5jZWlsKE1hdGguc3FydChmb3Jlc3QubGVuZ3RoKSk7XHJcbiAgdmFyIGhlaWdodCA9IDA7XHJcbiAgdmFyIGN1cnJlbnRZID0gMDtcclxuICB2YXIgY3VycmVudFggPSAwO1xyXG4gIHZhciBwb2ludCA9IG5ldyBQb2ludEQoMCwgMCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZm9yZXN0Lmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIGlmIChpICUgbnVtYmVyT2ZDb2x1bW5zID09IDApXHJcbiAgICB7XHJcbiAgICAgIC8vIFN0YXJ0IG9mIGEgbmV3IHJvdywgbWFrZSB0aGUgeCBjb29yZGluYXRlIDAsIGluY3JlbWVudCB0aGVcclxuICAgICAgLy8geSBjb29yZGluYXRlIHdpdGggdGhlIG1heCBoZWlnaHQgb2YgdGhlIHByZXZpb3VzIHJvd1xyXG4gICAgICBjdXJyZW50WCA9IDA7XHJcbiAgICAgIGN1cnJlbnRZID0gaGVpZ2h0O1xyXG5cclxuICAgICAgaWYgKGkgIT0gMClcclxuICAgICAge1xyXG4gICAgICAgIGN1cnJlbnRZICs9IENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT05FTlRfU0VQRVJBVElPTjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaGVpZ2h0ID0gMDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgdHJlZSA9IGZvcmVzdFtpXTtcclxuXHJcbiAgICAvLyBGaW5kIHRoZSBjZW50ZXIgb2YgdGhlIHRyZWVcclxuICAgIHZhciBjZW50ZXJOb2RlID0gTGF5b3V0LmZpbmRDZW50ZXJPZlRyZWUodHJlZSk7XHJcblxyXG4gICAgLy8gU2V0IHRoZSBzdGFyaW5nIHBvaW50IG9mIHRoZSBuZXh0IHRyZWVcclxuICAgIGN1cnJlbnRTdGFydGluZ1BvaW50LnggPSBjdXJyZW50WDtcclxuICAgIGN1cnJlbnRTdGFydGluZ1BvaW50LnkgPSBjdXJyZW50WTtcclxuXHJcbiAgICAvLyBEbyBhIHJhZGlhbCBsYXlvdXQgc3RhcnRpbmcgd2l0aCB0aGUgY2VudGVyXHJcbiAgICBwb2ludCA9XHJcbiAgICAgICAgICAgIENvU0VMYXlvdXQucmFkaWFsTGF5b3V0KHRyZWUsIGNlbnRlck5vZGUsIGN1cnJlbnRTdGFydGluZ1BvaW50KTtcclxuXHJcbiAgICBpZiAocG9pbnQueSA+IGhlaWdodClcclxuICAgIHtcclxuICAgICAgaGVpZ2h0ID0gTWF0aC5mbG9vcihwb2ludC55KTtcclxuICAgIH1cclxuXHJcbiAgICBjdXJyZW50WCA9IE1hdGguZmxvb3IocG9pbnQueCArIENvU0VDb25zdGFudHMuREVGQVVMVF9DT01QT05FTlRfU0VQRVJBVElPTik7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRyYW5zZm9ybShcclxuICAgICAgICAgIG5ldyBQb2ludEQoTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YIC0gcG9pbnQueCAvIDIsXHJcbiAgICAgICAgICAgICAgICAgIExheW91dENvbnN0YW50cy5XT1JMRF9DRU5URVJfWSAtIHBvaW50LnkgLyAyKSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnJhZGlhbExheW91dCA9IGZ1bmN0aW9uICh0cmVlLCBjZW50ZXJOb2RlLCBzdGFydGluZ1BvaW50KSB7XHJcbiAgdmFyIHJhZGlhbFNlcCA9IE1hdGgubWF4KHRoaXMubWF4RGlhZ29uYWxJblRyZWUodHJlZSksXHJcbiAgICAgICAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfUkFESUFMX1NFUEFSQVRJT04pO1xyXG4gIENvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0KGNlbnRlck5vZGUsIG51bGwsIDAsIDM1OSwgMCwgcmFkaWFsU2VwKTtcclxuICB2YXIgYm91bmRzID0gTEdyYXBoLmNhbGN1bGF0ZUJvdW5kcyh0cmVlKTtcclxuXHJcbiAgdmFyIHRyYW5zZm9ybSA9IG5ldyBUcmFuc2Zvcm0oKTtcclxuICB0cmFuc2Zvcm0uc2V0RGV2aWNlT3JnWChib3VuZHMuZ2V0TWluWCgpKTtcclxuICB0cmFuc2Zvcm0uc2V0RGV2aWNlT3JnWShib3VuZHMuZ2V0TWluWSgpKTtcclxuICB0cmFuc2Zvcm0uc2V0V29ybGRPcmdYKHN0YXJ0aW5nUG9pbnQueCk7XHJcbiAgdHJhbnNmb3JtLnNldFdvcmxkT3JnWShzdGFydGluZ1BvaW50LnkpO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIG5vZGUgPSB0cmVlW2ldO1xyXG4gICAgbm9kZS50cmFuc2Zvcm0odHJhbnNmb3JtKTtcclxuICB9XHJcblxyXG4gIHZhciBib3R0b21SaWdodCA9XHJcbiAgICAgICAgICBuZXcgUG9pbnREKGJvdW5kcy5nZXRNYXhYKCksIGJvdW5kcy5nZXRNYXhZKCkpO1xyXG5cclxuICByZXR1cm4gdHJhbnNmb3JtLmludmVyc2VUcmFuc2Zvcm1Qb2ludChib3R0b21SaWdodCk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LmJyYW5jaFJhZGlhbExheW91dCA9IGZ1bmN0aW9uIChub2RlLCBwYXJlbnRPZk5vZGUsIHN0YXJ0QW5nbGUsIGVuZEFuZ2xlLCBkaXN0YW5jZSwgcmFkaWFsU2VwYXJhdGlvbikge1xyXG4gIC8vIEZpcnN0LCBwb3NpdGlvbiB0aGlzIG5vZGUgYnkgZmluZGluZyBpdHMgYW5nbGUuXHJcbiAgdmFyIGhhbGZJbnRlcnZhbCA9ICgoZW5kQW5nbGUgLSBzdGFydEFuZ2xlKSArIDEpIC8gMjtcclxuXHJcbiAgaWYgKGhhbGZJbnRlcnZhbCA8IDApXHJcbiAge1xyXG4gICAgaGFsZkludGVydmFsICs9IDE4MDtcclxuICB9XHJcblxyXG4gIHZhciBub2RlQW5nbGUgPSAoaGFsZkludGVydmFsICsgc3RhcnRBbmdsZSkgJSAzNjA7XHJcbiAgdmFyIHRldGEgPSAobm9kZUFuZ2xlICogSUdlb21ldHJ5LlRXT19QSSkgLyAzNjA7XHJcblxyXG4gIC8vIE1ha2UgcG9sYXIgdG8gamF2YSBjb3JkaW5hdGUgY29udmVyc2lvbi5cclxuICB2YXIgY29zX3RldGEgPSBNYXRoLmNvcyh0ZXRhKTtcclxuICB2YXIgeF8gPSBkaXN0YW5jZSAqIE1hdGguY29zKHRldGEpO1xyXG4gIHZhciB5XyA9IGRpc3RhbmNlICogTWF0aC5zaW4odGV0YSk7XHJcblxyXG4gIG5vZGUuc2V0Q2VudGVyKHhfLCB5Xyk7XHJcblxyXG4gIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlIGFuZCByZWN1cnNpdmVseSBjYWxsIHRoaXNcclxuICAvLyBmdW5jdGlvbi5cclxuICB2YXIgbmVpZ2hib3JFZGdlcyA9IFtdO1xyXG4gIG5laWdoYm9yRWRnZXMgPSBuZWlnaGJvckVkZ2VzLmNvbmNhdChub2RlLmdldEVkZ2VzKCkpO1xyXG4gIHZhciBjaGlsZENvdW50ID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XHJcblxyXG4gIGlmIChwYXJlbnRPZk5vZGUgIT0gbnVsbClcclxuICB7XHJcbiAgICBjaGlsZENvdW50LS07XHJcbiAgfVxyXG5cclxuICB2YXIgYnJhbmNoQ291bnQgPSAwO1xyXG5cclxuICB2YXIgaW5jRWRnZXNDb3VudCA9IG5laWdoYm9yRWRnZXMubGVuZ3RoO1xyXG4gIHZhciBzdGFydEluZGV4O1xyXG5cclxuICB2YXIgZWRnZXMgPSBub2RlLmdldEVkZ2VzQmV0d2VlbihwYXJlbnRPZk5vZGUpO1xyXG5cclxuICAvLyBJZiB0aGVyZSBhcmUgbXVsdGlwbGUgZWRnZXMsIHBydW5lIHRoZW0gdW50aWwgdGhlcmUgcmVtYWlucyBvbmx5IG9uZVxyXG4gIC8vIGVkZ2UuXHJcbiAgd2hpbGUgKGVkZ2VzLmxlbmd0aCA+IDEpXHJcbiAge1xyXG4gICAgLy9uZWlnaGJvckVkZ2VzLnJlbW92ZShlZGdlcy5yZW1vdmUoMCkpO1xyXG4gICAgdmFyIHRlbXAgPSBlZGdlc1swXTtcclxuICAgIGVkZ2VzLnNwbGljZSgwLCAxKTtcclxuICAgIHZhciBpbmRleCA9IG5laWdoYm9yRWRnZXMuaW5kZXhPZih0ZW1wKTtcclxuICAgIGlmIChpbmRleCA+PSAwKSB7XHJcbiAgICAgIG5laWdoYm9yRWRnZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgIH1cclxuICAgIGluY0VkZ2VzQ291bnQtLTtcclxuICAgIGNoaWxkQ291bnQtLTtcclxuICB9XHJcblxyXG4gIGlmIChwYXJlbnRPZk5vZGUgIT0gbnVsbClcclxuICB7XHJcbiAgICAvL2Fzc2VydCBlZGdlcy5sZW5ndGggPT0gMTtcclxuICAgIHN0YXJ0SW5kZXggPSAobmVpZ2hib3JFZGdlcy5pbmRleE9mKGVkZ2VzWzBdKSArIDEpICUgaW5jRWRnZXNDb3VudDtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHN0YXJ0SW5kZXggPSAwO1xyXG4gIH1cclxuXHJcbiAgdmFyIHN0ZXBBbmdsZSA9IE1hdGguYWJzKGVuZEFuZ2xlIC0gc3RhcnRBbmdsZSkgLyBjaGlsZENvdW50O1xyXG5cclxuICBmb3IgKHZhciBpID0gc3RhcnRJbmRleDtcclxuICAgICAgICAgIGJyYW5jaENvdW50ICE9IGNoaWxkQ291bnQ7XHJcbiAgICAgICAgICBpID0gKCsraSkgJSBpbmNFZGdlc0NvdW50KVxyXG4gIHtcclxuICAgIHZhciBjdXJyZW50TmVpZ2hib3IgPVxyXG4gICAgICAgICAgICBuZWlnaGJvckVkZ2VzW2ldLmdldE90aGVyRW5kKG5vZGUpO1xyXG5cclxuICAgIC8vIERvbid0IGJhY2sgdHJhdmVyc2UgdG8gcm9vdCBub2RlIGluIGN1cnJlbnQgdHJlZS5cclxuICAgIGlmIChjdXJyZW50TmVpZ2hib3IgPT0gcGFyZW50T2ZOb2RlKVxyXG4gICAge1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgY2hpbGRTdGFydEFuZ2xlID1cclxuICAgICAgICAgICAgKHN0YXJ0QW5nbGUgKyBicmFuY2hDb3VudCAqIHN0ZXBBbmdsZSkgJSAzNjA7XHJcbiAgICB2YXIgY2hpbGRFbmRBbmdsZSA9IChjaGlsZFN0YXJ0QW5nbGUgKyBzdGVwQW5nbGUpICUgMzYwO1xyXG5cclxuICAgIENvU0VMYXlvdXQuYnJhbmNoUmFkaWFsTGF5b3V0KGN1cnJlbnROZWlnaGJvcixcclxuICAgICAgICAgICAgbm9kZSxcclxuICAgICAgICAgICAgY2hpbGRTdGFydEFuZ2xlLCBjaGlsZEVuZEFuZ2xlLFxyXG4gICAgICAgICAgICBkaXN0YW5jZSArIHJhZGlhbFNlcGFyYXRpb24sIHJhZGlhbFNlcGFyYXRpb24pO1xyXG5cclxuICAgIGJyYW5jaENvdW50Kys7XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5tYXhEaWFnb25hbEluVHJlZSA9IGZ1bmN0aW9uICh0cmVlKSB7XHJcbiAgdmFyIG1heERpYWdvbmFsID0gSW50ZWdlci5NSU5fVkFMVUU7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdHJlZS5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICB2YXIgbm9kZSA9IHRyZWVbaV07XHJcbiAgICB2YXIgZGlhZ29uYWwgPSBub2RlLmdldERpYWdvbmFsKCk7XHJcblxyXG4gICAgaWYgKGRpYWdvbmFsID4gbWF4RGlhZ29uYWwpXHJcbiAgICB7XHJcbiAgICAgIG1heERpYWdvbmFsID0gZGlhZ29uYWw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWF4RGlhZ29uYWw7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jYWxjUmVwdWxzaW9uUmFuZ2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgLy8gZm9ybXVsYSBpcyAyIHggKGxldmVsICsgMSkgeCBpZGVhbEVkZ2VMZW5ndGhcclxuICByZXR1cm4gKDIgKiAodGhpcy5sZXZlbCArIDEpICogdGhpcy5pZGVhbEVkZ2VMZW5ndGgpO1xyXG59O1xyXG5cclxuLy8gVGlsaW5nIG1ldGhvZHNcclxuXHJcbi8vIEdyb3VwIHplcm8gZGVncmVlIG1lbWJlcnMgd2hvc2UgcGFyZW50cyBhcmUgbm90IHRvIGJlIHRpbGVkLCBjcmVhdGUgZHVtbXkgcGFyZW50cyB3aGVyZSBuZWVkZWQgYW5kIGZpbGwgbWVtYmVyR3JvdXBzIGJ5IHRoZWlyIGR1bW1wIHBhcmVudCBpZCdzXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdyb3VwWmVyb0RlZ3JlZU1lbWJlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIC8vIGFycmF5IG9mIFtwYXJlbnRfaWQgeCBvbmVEZWdyZWVOb2RlX2lkXVxyXG4gIHZhciB0ZW1wTWVtYmVyR3JvdXBzID0ge307IC8vIEEgdGVtcG9yYXJ5IG1hcCBvZiBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnNcclxuICB0aGlzLm1lbWJlckdyb3VwcyA9IHt9OyAvLyBBIG1hcCBvZiBkdW1teSBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnMgd2hvc2UgcGFyZW50cyBhcmUgbm90IHRvIGJlIHRpbGVkXHJcbiAgdGhpcy5pZFRvRHVtbXlOb2RlID0ge307IC8vIEEgbWFwIG9mIGlkIHRvIGR1bW15IG5vZGUgXHJcbiAgXHJcbiAgdmFyIHplcm9EZWdyZWUgPSBbXTsgLy8gTGlzdCBvZiB6ZXJvIGRlZ3JlZSBub2RlcyB3aG9zZSBwYXJlbnRzIGFyZSBub3QgdG8gYmUgdGlsZWRcclxuICB2YXIgYWxsTm9kZXMgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxOb2RlcygpO1xyXG5cclxuICAvLyBGaWxsIHplcm8gZGVncmVlIGxpc3RcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgbm9kZSA9IGFsbE5vZGVzW2ldO1xyXG4gICAgdmFyIHBhcmVudCA9IG5vZGUuZ2V0UGFyZW50KCk7XHJcbiAgICAvLyBJZiBhIG5vZGUgaGFzIHplcm8gZGVncmVlIGFuZCBpdHMgcGFyZW50IGlzIG5vdCB0byBiZSB0aWxlZCBpZiBleGlzdHMgYWRkIHRoYXQgbm9kZSB0byB6ZXJvRGVncmVzIGxpc3RcclxuICAgIGlmICh0aGlzLmdldE5vZGVEZWdyZWVXaXRoQ2hpbGRyZW4obm9kZSkgPT09IDAgJiYgKCBwYXJlbnQuaWQgPT0gdW5kZWZpbmVkIHx8ICF0aGlzLmdldFRvQmVUaWxlZChwYXJlbnQpICkgKSB7XHJcbiAgICAgIHplcm9EZWdyZWUucHVzaChub2RlKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIENyZWF0ZSBhIG1hcCBvZiBwYXJlbnQgbm9kZSBhbmQgaXRzIHplcm8gZGVncmVlIG1lbWJlcnNcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHplcm9EZWdyZWUubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIG5vZGUgPSB6ZXJvRGVncmVlW2ldOyAvLyBaZXJvIGRlZ3JlZSBub2RlIGl0c2VsZlxyXG4gICAgdmFyIHBfaWQgPSBub2RlLmdldFBhcmVudCgpLmlkOyAvLyBQYXJlbnQgaWRcclxuXHJcbiAgICBpZiAodHlwZW9mIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPT09IFwidW5kZWZpbmVkXCIpXHJcbiAgICAgIHRlbXBNZW1iZXJHcm91cHNbcF9pZF0gPSBbXTtcclxuXHJcbiAgICB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXS5jb25jYXQobm9kZSk7IC8vIFB1c2ggbm9kZSB0byB0aGUgbGlzdCBiZWxvbmdzIHRvIGl0cyBwYXJlbnQgaW4gdGVtcE1lbWJlckdyb3Vwc1xyXG4gIH1cclxuXHJcbiAgLy8gSWYgdGhlcmUgYXJlIGF0IGxlYXN0IHR3byBub2RlcyBhdCBhIGxldmVsLCBjcmVhdGUgYSBkdW1teSBjb21wb3VuZCBmb3IgdGhlbVxyXG4gIE9iamVjdC5rZXlzKHRlbXBNZW1iZXJHcm91cHMpLmZvckVhY2goZnVuY3Rpb24ocF9pZCkge1xyXG4gICAgaWYgKHRlbXBNZW1iZXJHcm91cHNbcF9pZF0ubGVuZ3RoID4gMSkge1xyXG4gICAgICB2YXIgZHVtbXlDb21wb3VuZElkID0gXCJEdW1teUNvbXBvdW5kX1wiICsgcF9pZDsgLy8gVGhlIGlkIG9mIGR1bW15IGNvbXBvdW5kIHdoaWNoIHdpbGwgYmUgY3JlYXRlZCBzb29uXHJcbiAgICAgIHNlbGYubWVtYmVyR3JvdXBzW2R1bW15Q29tcG91bmRJZF0gPSB0ZW1wTWVtYmVyR3JvdXBzW3BfaWRdOyAvLyBBZGQgZHVtbXkgY29tcG91bmQgdG8gbWVtYmVyR3JvdXBzXHJcblxyXG4gICAgICB2YXIgcGFyZW50ID0gdGVtcE1lbWJlckdyb3Vwc1twX2lkXVswXS5nZXRQYXJlbnQoKTsgLy8gVGhlIHBhcmVudCBvZiB6ZXJvIGRlZ3JlZSBub2RlcyB3aWxsIGJlIHRoZSBwYXJlbnQgb2YgbmV3IGR1bW15IGNvbXBvdW5kXHJcblxyXG4gICAgICAvLyBDcmVhdGUgYSBkdW1teSBjb21wb3VuZCB3aXRoIGNhbGN1bGF0ZWQgaWRcclxuICAgICAgdmFyIGR1bW15Q29tcG91bmQgPSBuZXcgQ29TRU5vZGUoc2VsZi5ncmFwaE1hbmFnZXIpO1xyXG4gICAgICBkdW1teUNvbXBvdW5kLmlkID0gZHVtbXlDb21wb3VuZElkO1xyXG4gICAgICBkdW1teUNvbXBvdW5kLnBhZGRpbmdMZWZ0ID0gcGFyZW50LnBhZGRpbmdMZWZ0IHx8IDA7XHJcbiAgICAgIGR1bW15Q29tcG91bmQucGFkZGluZ1JpZ2h0ID0gcGFyZW50LnBhZGRpbmdSaWdodCB8fCAwO1xyXG4gICAgICBkdW1teUNvbXBvdW5kLnBhZGRpbmdCb3R0b20gPSBwYXJlbnQucGFkZGluZ0JvdHRvbSB8fCAwO1xyXG4gICAgICBkdW1teUNvbXBvdW5kLnBhZGRpbmdUb3AgPSBwYXJlbnQucGFkZGluZ1RvcCB8fCAwO1xyXG4gICAgICBcclxuICAgICAgc2VsZi5pZFRvRHVtbXlOb2RlW2R1bW15Q29tcG91bmRJZF0gPSBkdW1teUNvbXBvdW5kO1xyXG4gICAgICBcclxuICAgICAgdmFyIGR1bW15UGFyZW50R3JhcGggPSBzZWxmLmdldEdyYXBoTWFuYWdlcigpLmFkZChzZWxmLm5ld0dyYXBoKCksIGR1bW15Q29tcG91bmQpO1xyXG4gICAgICB2YXIgcGFyZW50R3JhcGggPSBwYXJlbnQuZ2V0Q2hpbGQoKTtcclxuXHJcbiAgICAgIC8vIEFkZCBkdW1teSBjb21wb3VuZCB0byBwYXJlbnQgdGhlIGdyYXBoXHJcbiAgICAgIHBhcmVudEdyYXBoLmFkZChkdW1teUNvbXBvdW5kKTtcclxuXHJcbiAgICAgIC8vIEZvciBlYWNoIHplcm8gZGVncmVlIG5vZGUgaW4gdGhpcyBsZXZlbCByZW1vdmUgaXQgZnJvbSBpdHMgcGFyZW50IGdyYXBoIGFuZCBhZGQgaXQgdG8gdGhlIGdyYXBoIG9mIGR1bW15IHBhcmVudFxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRlbXBNZW1iZXJHcm91cHNbcF9pZF0ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgbm9kZSA9IHRlbXBNZW1iZXJHcm91cHNbcF9pZF1baV07XHJcbiAgICAgICAgXHJcbiAgICAgICAgcGFyZW50R3JhcGgucmVtb3ZlKG5vZGUpO1xyXG4gICAgICAgIGR1bW15UGFyZW50R3JhcGguYWRkKG5vZGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSk7XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jbGVhckNvbXBvdW5kcyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY2hpbGRHcmFwaE1hcCA9IHt9O1xyXG4gIHZhciBpZFRvTm9kZSA9IHt9O1xyXG5cclxuICAvLyBHZXQgY29tcG91bmQgb3JkZXJpbmcgYnkgZmluZGluZyB0aGUgaW5uZXIgb25lIGZpcnN0XHJcbiAgdGhpcy5wZXJmb3JtREZTT25Db21wb3VuZHMoKTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmNvbXBvdW5kT3JkZXIubGVuZ3RoOyBpKyspIHtcclxuICAgIFxyXG4gICAgaWRUb05vZGVbdGhpcy5jb21wb3VuZE9yZGVyW2ldLmlkXSA9IHRoaXMuY29tcG91bmRPcmRlcltpXTtcclxuICAgIGNoaWxkR3JhcGhNYXBbdGhpcy5jb21wb3VuZE9yZGVyW2ldLmlkXSA9IFtdLmNvbmNhdCh0aGlzLmNvbXBvdW5kT3JkZXJbaV0uZ2V0Q2hpbGQoKS5nZXROb2RlcygpKTtcclxuXHJcbiAgICAvLyBSZW1vdmUgY2hpbGRyZW4gb2YgY29tcG91bmRzXHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUodGhpcy5jb21wb3VuZE9yZGVyW2ldLmdldENoaWxkKCkpO1xyXG4gICAgdGhpcy5jb21wb3VuZE9yZGVyW2ldLmNoaWxkID0gbnVsbDtcclxuICB9XHJcbiAgXHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIucmVzZXRBbGxOb2RlcygpO1xyXG4gIFxyXG4gIC8vIFRpbGUgdGhlIHJlbW92ZWQgY2hpbGRyZW5cclxuICB0aGlzLnRpbGVDb21wb3VuZE1lbWJlcnMoY2hpbGRHcmFwaE1hcCwgaWRUb05vZGUpO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuY2xlYXJaZXJvRGVncmVlTWVtYmVycyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgdmFyIHRpbGVkWmVyb0RlZ3JlZVBhY2sgPSB0aGlzLnRpbGVkWmVyb0RlZ3JlZVBhY2sgPSBbXTtcclxuXHJcbiAgT2JqZWN0LmtleXModGhpcy5tZW1iZXJHcm91cHMpLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcclxuICAgIHZhciBjb21wb3VuZE5vZGUgPSBzZWxmLmlkVG9EdW1teU5vZGVbaWRdOyAvLyBHZXQgdGhlIGR1bW15IGNvbXBvdW5kXHJcblxyXG4gICAgdGlsZWRaZXJvRGVncmVlUGFja1tpZF0gPSBzZWxmLnRpbGVOb2RlcyhzZWxmLm1lbWJlckdyb3Vwc1tpZF0sIGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdCArIGNvbXBvdW5kTm9kZS5wYWRkaW5nUmlnaHQpO1xyXG5cclxuICAgIC8vIFNldCB0aGUgd2lkdGggYW5kIGhlaWdodCBvZiB0aGUgZHVtbXkgY29tcG91bmQgYXMgY2FsY3VsYXRlZFxyXG4gICAgY29tcG91bmROb2RlLnJlY3Qud2lkdGggPSB0aWxlZFplcm9EZWdyZWVQYWNrW2lkXS53aWR0aDtcclxuICAgIGNvbXBvdW5kTm9kZS5yZWN0LmhlaWdodCA9IHRpbGVkWmVyb0RlZ3JlZVBhY2tbaWRdLmhlaWdodDtcclxuICB9KTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnJlcG9wdWxhdGVDb21wb3VuZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgZm9yICh2YXIgaSA9IHRoaXMuY29tcG91bmRPcmRlci5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xyXG4gICAgdmFyIGxDb21wb3VuZE5vZGUgPSB0aGlzLmNvbXBvdW5kT3JkZXJbaV07XHJcbiAgICB2YXIgaWQgPSBsQ29tcG91bmROb2RlLmlkO1xyXG4gICAgdmFyIGhvcml6b250YWxNYXJnaW4gPSBsQ29tcG91bmROb2RlLnBhZGRpbmdMZWZ0O1xyXG4gICAgdmFyIHZlcnRpY2FsTWFyZ2luID0gbENvbXBvdW5kTm9kZS5wYWRkaW5nVG9wO1xyXG5cclxuICAgIHRoaXMuYWRqdXN0TG9jYXRpb25zKHRoaXMudGlsZWRNZW1iZXJQYWNrW2lkXSwgbENvbXBvdW5kTm9kZS5yZWN0LngsIGxDb21wb3VuZE5vZGUucmVjdC55LCBob3Jpem9udGFsTWFyZ2luLCB2ZXJ0aWNhbE1hcmdpbik7XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUucmVwb3B1bGF0ZVplcm9EZWdyZWVNZW1iZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICB2YXIgdGlsZWRQYWNrID0gdGhpcy50aWxlZFplcm9EZWdyZWVQYWNrO1xyXG4gIFxyXG4gIE9iamVjdC5rZXlzKHRpbGVkUGFjaykuZm9yRWFjaChmdW5jdGlvbihpZCkge1xyXG4gICAgdmFyIGNvbXBvdW5kTm9kZSA9IHNlbGYuaWRUb0R1bW15Tm9kZVtpZF07IC8vIEdldCB0aGUgZHVtbXkgY29tcG91bmQgYnkgaXRzIGlkXHJcbiAgICB2YXIgaG9yaXpvbnRhbE1hcmdpbiA9IGNvbXBvdW5kTm9kZS5wYWRkaW5nTGVmdDtcclxuICAgIHZhciB2ZXJ0aWNhbE1hcmdpbiA9IGNvbXBvdW5kTm9kZS5wYWRkaW5nVG9wO1xyXG5cclxuICAgIC8vIEFkanVzdCB0aGUgcG9zaXRpb25zIG9mIG5vZGVzIHdydCBpdHMgY29tcG91bmRcclxuICAgIHNlbGYuYWRqdXN0TG9jYXRpb25zKHRpbGVkUGFja1tpZF0sIGNvbXBvdW5kTm9kZS5yZWN0LngsIGNvbXBvdW5kTm9kZS5yZWN0LnksIGhvcml6b250YWxNYXJnaW4sIHZlcnRpY2FsTWFyZ2luKTtcclxuICB9KTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldFRvQmVUaWxlZCA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgdmFyIGlkID0gbm9kZS5pZDtcclxuICAvL2ZpcnN0bHkgY2hlY2sgdGhlIHByZXZpb3VzIHJlc3VsdHNcclxuICBpZiAodGhpcy50b0JlVGlsZWRbaWRdICE9IG51bGwpIHtcclxuICAgIHJldHVybiB0aGlzLnRvQmVUaWxlZFtpZF07XHJcbiAgfVxyXG5cclxuICAvL29ubHkgY29tcG91bmQgbm9kZXMgYXJlIHRvIGJlIHRpbGVkXHJcbiAgdmFyIGNoaWxkR3JhcGggPSBub2RlLmdldENoaWxkKCk7XHJcbiAgaWYgKGNoaWxkR3JhcGggPT0gbnVsbCkge1xyXG4gICAgdGhpcy50b0JlVGlsZWRbaWRdID0gZmFsc2U7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICB2YXIgY2hpbGRyZW4gPSBjaGlsZEdyYXBoLmdldE5vZGVzKCk7IC8vIEdldCB0aGUgY2hpbGRyZW4gbm9kZXNcclxuXHJcbiAgLy9hIGNvbXBvdW5kIG5vZGUgaXMgbm90IHRvIGJlIHRpbGVkIGlmIGFsbCBvZiBpdHMgY29tcG91bmQgY2hpbGRyZW4gYXJlIG5vdCB0byBiZSB0aWxlZFxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciB0aGVDaGlsZCA9IGNoaWxkcmVuW2ldO1xyXG5cclxuICAgIGlmICh0aGlzLmdldE5vZGVEZWdyZWUodGhlQ2hpbGQpID4gMCkge1xyXG4gICAgICB0aGlzLnRvQmVUaWxlZFtpZF0gPSBmYWxzZTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vcGFzcyB0aGUgY2hpbGRyZW4gbm90IGhhdmluZyB0aGUgY29tcG91bmQgc3RydWN0dXJlXHJcbiAgICBpZiAodGhlQ2hpbGQuZ2V0Q2hpbGQoKSA9PSBudWxsKSB7XHJcbiAgICAgIHRoaXMudG9CZVRpbGVkW3RoZUNoaWxkLmlkXSA9IGZhbHNlO1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXRoaXMuZ2V0VG9CZVRpbGVkKHRoZUNoaWxkKSkge1xyXG4gICAgICB0aGlzLnRvQmVUaWxlZFtpZF0gPSBmYWxzZTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuICB0aGlzLnRvQmVUaWxlZFtpZF0gPSB0cnVlO1xyXG4gIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuLy8gR2V0IGRlZ3JlZSBvZiBhIG5vZGUgZGVwZW5kaW5nIG9mIGl0cyBlZGdlcyBhbmQgaW5kZXBlbmRlbnQgb2YgaXRzIGNoaWxkcmVuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldE5vZGVEZWdyZWUgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBpZCA9IG5vZGUuaWQ7XHJcbiAgdmFyIGVkZ2VzID0gbm9kZS5nZXRFZGdlcygpO1xyXG4gIHZhciBkZWdyZWUgPSAwO1xyXG4gIFxyXG4gIC8vIEZvciB0aGUgZWRnZXMgY29ubmVjdGVkXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBlZGdlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGVkZ2UgPSBlZGdlc1tpXTtcclxuICAgIGlmIChlZGdlLmdldFNvdXJjZSgpLmlkICE9PSBlZGdlLmdldFRhcmdldCgpLmlkKSB7XHJcbiAgICAgIGRlZ3JlZSA9IGRlZ3JlZSArIDE7XHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBkZWdyZWU7XHJcbn07XHJcblxyXG4vLyBHZXQgZGVncmVlIG9mIGEgbm9kZSB3aXRoIGl0cyBjaGlsZHJlblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgZGVncmVlID0gdGhpcy5nZXROb2RlRGVncmVlKG5vZGUpO1xyXG4gIGlmIChub2RlLmdldENoaWxkKCkgPT0gbnVsbCkge1xyXG4gICAgcmV0dXJuIGRlZ3JlZTtcclxuICB9XHJcbiAgdmFyIGNoaWxkcmVuID0gbm9kZS5nZXRDaGlsZCgpLmdldE5vZGVzKCk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICBkZWdyZWUgKz0gdGhpcy5nZXROb2RlRGVncmVlV2l0aENoaWxkcmVuKGNoaWxkKTtcclxuICB9XHJcbiAgcmV0dXJuIGRlZ3JlZTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnBlcmZvcm1ERlNPbkNvbXBvdW5kcyA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLmNvbXBvdW5kT3JkZXIgPSBbXTtcclxuICB0aGlzLmZpbGxDb21wZXhPcmRlckJ5REZTKHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpKTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmZpbGxDb21wZXhPcmRlckJ5REZTID0gZnVuY3Rpb24gKGNoaWxkcmVuKSB7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICBpZiAoY2hpbGQuZ2V0Q2hpbGQoKSAhPSBudWxsKSB7XHJcbiAgICAgIHRoaXMuZmlsbENvbXBleE9yZGVyQnlERlMoY2hpbGQuZ2V0Q2hpbGQoKS5nZXROb2RlcygpKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdldFRvQmVUaWxlZChjaGlsZCkpIHtcclxuICAgICAgdGhpcy5jb21wb3VuZE9yZGVyLnB1c2goY2hpbGQpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4qIFRoaXMgbWV0aG9kIHBsYWNlcyBlYWNoIHplcm8gZGVncmVlIG1lbWJlciB3cnQgZ2l2ZW4gKHgseSkgY29vcmRpbmF0ZXMgKHRvcCBsZWZ0KS5cclxuKi9cclxuQ29TRUxheW91dC5wcm90b3R5cGUuYWRqdXN0TG9jYXRpb25zID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbiwgeCwgeSwgY29tcG91bmRIb3Jpem9udGFsTWFyZ2luLCBjb21wb3VuZFZlcnRpY2FsTWFyZ2luKSB7XHJcbiAgeCArPSBjb21wb3VuZEhvcml6b250YWxNYXJnaW47XHJcbiAgeSArPSBjb21wb3VuZFZlcnRpY2FsTWFyZ2luO1xyXG5cclxuICB2YXIgbGVmdCA9IHg7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciByb3cgPSBvcmdhbml6YXRpb24ucm93c1tpXTtcclxuICAgIHggPSBsZWZ0O1xyXG4gICAgdmFyIG1heEhlaWdodCA9IDA7XHJcblxyXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCByb3cubGVuZ3RoOyBqKyspIHtcclxuICAgICAgdmFyIGxub2RlID0gcm93W2pdO1xyXG5cclxuICAgICAgbG5vZGUucmVjdC54ID0geDsvLyArIGxub2RlLnJlY3Qud2lkdGggLyAyO1xyXG4gICAgICBsbm9kZS5yZWN0LnkgPSB5Oy8vICsgbG5vZGUucmVjdC5oZWlnaHQgLyAyO1xyXG5cclxuICAgICAgeCArPSBsbm9kZS5yZWN0LndpZHRoICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nO1xyXG5cclxuICAgICAgaWYgKGxub2RlLnJlY3QuaGVpZ2h0ID4gbWF4SGVpZ2h0KVxyXG4gICAgICAgIG1heEhlaWdodCA9IGxub2RlLnJlY3QuaGVpZ2h0O1xyXG4gICAgfVxyXG5cclxuICAgIHkgKz0gbWF4SGVpZ2h0ICsgb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcclxuICB9XHJcbn07XHJcblxyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS50aWxlQ29tcG91bmRNZW1iZXJzID0gZnVuY3Rpb24gKGNoaWxkR3JhcGhNYXAsIGlkVG9Ob2RlKSB7XHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHRoaXMudGlsZWRNZW1iZXJQYWNrID0gW107XHJcblxyXG4gIE9iamVjdC5rZXlzKGNoaWxkR3JhcGhNYXApLmZvckVhY2goZnVuY3Rpb24oaWQpIHtcclxuICAgIC8vIEdldCB0aGUgY29tcG91bmQgbm9kZVxyXG4gICAgdmFyIGNvbXBvdW5kTm9kZSA9IGlkVG9Ob2RlW2lkXTtcclxuXHJcbiAgICBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0gPSBzZWxmLnRpbGVOb2RlcyhjaGlsZEdyYXBoTWFwW2lkXSwgY29tcG91bmROb2RlLnBhZGRpbmdMZWZ0ICsgY29tcG91bmROb2RlLnBhZGRpbmdSaWdodCk7XHJcblxyXG4gICAgY29tcG91bmROb2RlLnJlY3Qud2lkdGggPSBzZWxmLnRpbGVkTWVtYmVyUGFja1tpZF0ud2lkdGggKyAyMDtcclxuICAgIGNvbXBvdW5kTm9kZS5yZWN0LmhlaWdodCA9IHNlbGYudGlsZWRNZW1iZXJQYWNrW2lkXS5oZWlnaHQgKyAyMDtcclxuICB9KTtcclxufTtcclxuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnRpbGVOb2RlcyA9IGZ1bmN0aW9uIChub2RlcywgbWluV2lkdGgpIHtcclxuICB2YXIgdmVydGljYWxQYWRkaW5nID0gQ29TRUNvbnN0YW50cy5USUxJTkdfUEFERElOR19WRVJUSUNBTDtcclxuICB2YXIgaG9yaXpvbnRhbFBhZGRpbmcgPSBDb1NFQ29uc3RhbnRzLlRJTElOR19QQURESU5HX0hPUklaT05UQUw7XHJcbiAgdmFyIG9yZ2FuaXphdGlvbiA9IHtcclxuICAgIHJvd3M6IFtdLFxyXG4gICAgcm93V2lkdGg6IFtdLFxyXG4gICAgcm93SGVpZ2h0OiBbXSxcclxuICAgIHdpZHRoOiAyMCxcclxuICAgIGhlaWdodDogMjAsXHJcbiAgICB2ZXJ0aWNhbFBhZGRpbmc6IHZlcnRpY2FsUGFkZGluZyxcclxuICAgIGhvcml6b250YWxQYWRkaW5nOiBob3Jpem9udGFsUGFkZGluZ1xyXG4gIH07XHJcblxyXG4gIC8vIFNvcnQgdGhlIG5vZGVzIGluIGFzY2VuZGluZyBvcmRlciBvZiB0aGVpciBhcmVhc1xyXG4gIG5vZGVzLnNvcnQoZnVuY3Rpb24gKG4xLCBuMikge1xyXG4gICAgaWYgKG4xLnJlY3Qud2lkdGggKiBuMS5yZWN0LmhlaWdodCA+IG4yLnJlY3Qud2lkdGggKiBuMi5yZWN0LmhlaWdodClcclxuICAgICAgcmV0dXJuIC0xO1xyXG4gICAgaWYgKG4xLnJlY3Qud2lkdGggKiBuMS5yZWN0LmhlaWdodCA8IG4yLnJlY3Qud2lkdGggKiBuMi5yZWN0LmhlaWdodClcclxuICAgICAgcmV0dXJuIDE7XHJcbiAgICByZXR1cm4gMDtcclxuICB9KTtcclxuXHJcbiAgLy8gQ3JlYXRlIHRoZSBvcmdhbml6YXRpb24gLT4gdGlsZSBtZW1iZXJzXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XHJcbiAgICBcclxuICAgIGlmIChvcmdhbml6YXRpb24ucm93cy5sZW5ndGggPT0gMCkge1xyXG4gICAgICB0aGlzLmluc2VydE5vZGVUb1Jvdyhvcmdhbml6YXRpb24sIGxOb2RlLCAwLCBtaW5XaWR0aCk7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0aGlzLmNhbkFkZEhvcml6b250YWwob3JnYW5pemF0aW9uLCBsTm9kZS5yZWN0LndpZHRoLCBsTm9kZS5yZWN0LmhlaWdodCkpIHtcclxuICAgICAgdGhpcy5pbnNlcnROb2RlVG9Sb3cob3JnYW5pemF0aW9uLCBsTm9kZSwgdGhpcy5nZXRTaG9ydGVzdFJvd0luZGV4KG9yZ2FuaXphdGlvbiksIG1pbldpZHRoKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLmluc2VydE5vZGVUb1Jvdyhvcmdhbml6YXRpb24sIGxOb2RlLCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGgsIG1pbldpZHRoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnNoaWZ0VG9MYXN0Um93KG9yZ2FuaXphdGlvbik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3JnYW5pemF0aW9uO1xyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUuaW5zZXJ0Tm9kZVRvUm93ID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbiwgbm9kZSwgcm93SW5kZXgsIG1pbldpZHRoKSB7XHJcbiAgdmFyIG1pbkNvbXBvdW5kU2l6ZSA9IG1pbldpZHRoO1xyXG5cclxuICAvLyBBZGQgbmV3IHJvdyBpZiBuZWVkZWRcclxuICBpZiAocm93SW5kZXggPT0gb3JnYW5pemF0aW9uLnJvd3MubGVuZ3RoKSB7XHJcbiAgICB2YXIgc2Vjb25kRGltZW5zaW9uID0gW107XHJcblxyXG4gICAgb3JnYW5pemF0aW9uLnJvd3MucHVzaChzZWNvbmREaW1lbnNpb24pO1xyXG4gICAgb3JnYW5pemF0aW9uLnJvd1dpZHRoLnB1c2gobWluQ29tcG91bmRTaXplKTtcclxuICAgIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHQucHVzaCgwKTtcclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSByb3cgd2lkdGhcclxuICB2YXIgdyA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtyb3dJbmRleF0gKyBub2RlLnJlY3Qud2lkdGg7XHJcblxyXG4gIGlmIChvcmdhbml6YXRpb24ucm93c1tyb3dJbmRleF0ubGVuZ3RoID4gMCkge1xyXG4gICAgdyArPSBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmc7XHJcbiAgfVxyXG5cclxuICBvcmdhbml6YXRpb24ucm93V2lkdGhbcm93SW5kZXhdID0gdztcclxuICAvLyBVcGRhdGUgY29tcG91bmQgd2lkdGhcclxuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIDwgdykge1xyXG4gICAgb3JnYW5pemF0aW9uLndpZHRoID0gdztcclxuICB9XHJcblxyXG4gIC8vIFVwZGF0ZSBoZWlnaHRcclxuICB2YXIgaCA9IG5vZGUucmVjdC5oZWlnaHQ7XHJcbiAgaWYgKHJvd0luZGV4ID4gMClcclxuICAgIGggKz0gb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcclxuXHJcbiAgdmFyIGV4dHJhSGVpZ2h0ID0gMDtcclxuICBpZiAoaCA+IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbcm93SW5kZXhdKSB7XHJcbiAgICBleHRyYUhlaWdodCA9IG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbcm93SW5kZXhdO1xyXG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtyb3dJbmRleF0gPSBoO1xyXG4gICAgZXh0cmFIZWlnaHQgPSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3Jvd0luZGV4XSAtIGV4dHJhSGVpZ2h0O1xyXG4gIH1cclxuXHJcbiAgb3JnYW5pemF0aW9uLmhlaWdodCArPSBleHRyYUhlaWdodDtcclxuXHJcbiAgLy8gSW5zZXJ0IG5vZGVcclxuICBvcmdhbml6YXRpb24ucm93c1tyb3dJbmRleF0ucHVzaChub2RlKTtcclxufTtcclxuXHJcbi8vU2NhbnMgdGhlIHJvd3Mgb2YgYW4gb3JnYW5pemF0aW9uIGFuZCByZXR1cm5zIHRoZSBvbmUgd2l0aCB0aGUgbWluIHdpZHRoXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldFNob3J0ZXN0Um93SW5kZXggPSBmdW5jdGlvbiAob3JnYW5pemF0aW9uKSB7XHJcbiAgdmFyIHIgPSAtMTtcclxuICB2YXIgbWluID0gTnVtYmVyLk1BWF9WQUxVRTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcmdhbml6YXRpb24ucm93cy5sZW5ndGg7IGkrKykge1xyXG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA8IG1pbikge1xyXG4gICAgICByID0gaTtcclxuICAgICAgbWluID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2ldO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gcjtcclxufTtcclxuXHJcbi8vU2NhbnMgdGhlIHJvd3Mgb2YgYW4gb3JnYW5pemF0aW9uIGFuZCByZXR1cm5zIHRoZSBvbmUgd2l0aCB0aGUgbWF4IHdpZHRoXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLmdldExvbmdlc3RSb3dJbmRleCA9IGZ1bmN0aW9uIChvcmdhbml6YXRpb24pIHtcclxuICB2YXIgciA9IC0xO1xyXG4gIHZhciBtYXggPSBOdW1iZXIuTUlOX1ZBTFVFO1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IG9yZ2FuaXphdGlvbi5yb3dzLmxlbmd0aDsgaSsrKSB7XHJcblxyXG4gICAgaWYgKG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpXSA+IG1heCkge1xyXG4gICAgICByID0gaTtcclxuICAgICAgbWF4ID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2ldO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHI7XHJcbn07XHJcblxyXG4vKipcclxuKiBUaGlzIG1ldGhvZCBjaGVja3Mgd2hldGhlciBhZGRpbmcgZXh0cmEgd2lkdGggdG8gdGhlIG9yZ2FuaXphdGlvbiB2aW9sYXRlc1xyXG4qIHRoZSBhc3BlY3QgcmF0aW8oMSkgb3Igbm90LlxyXG4qL1xyXG5Db1NFTGF5b3V0LnByb3RvdHlwZS5jYW5BZGRIb3Jpem9udGFsID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbiwgZXh0cmFXaWR0aCwgZXh0cmFIZWlnaHQpIHtcclxuXHJcbiAgdmFyIHNyaSA9IHRoaXMuZ2V0U2hvcnRlc3RSb3dJbmRleChvcmdhbml6YXRpb24pO1xyXG5cclxuICBpZiAoc3JpIDwgMCkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICB2YXIgbWluID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW3NyaV07XHJcblxyXG4gIGlmIChtaW4gKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmcgKyBleHRyYVdpZHRoIDw9IG9yZ2FuaXphdGlvbi53aWR0aClcclxuICAgIHJldHVybiB0cnVlO1xyXG5cclxuICB2YXIgaERpZmYgPSAwO1xyXG5cclxuICAvLyBBZGRpbmcgdG8gYW4gZXhpc3Rpbmcgcm93XHJcbiAgaWYgKG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbc3JpXSA8IGV4dHJhSGVpZ2h0KSB7XHJcbiAgICBpZiAoc3JpID4gMClcclxuICAgICAgaERpZmYgPSBleHRyYUhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmcgLSBvcmdhbml6YXRpb24ucm93SGVpZ2h0W3NyaV07XHJcbiAgfVxyXG5cclxuICB2YXIgYWRkX3RvX3Jvd19yYXRpbztcclxuICBpZiAob3JnYW5pemF0aW9uLndpZHRoIC0gbWluID49IGV4dHJhV2lkdGggKyBvcmdhbml6YXRpb24uaG9yaXpvbnRhbFBhZGRpbmcpIHtcclxuICAgIGFkZF90b19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIChtaW4gKyBleHRyYVdpZHRoICsgb3JnYW5pemF0aW9uLmhvcml6b250YWxQYWRkaW5nKTtcclxuICB9IGVsc2Uge1xyXG4gICAgYWRkX3RvX3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gb3JnYW5pemF0aW9uLndpZHRoO1xyXG4gIH1cclxuXHJcbiAgLy8gQWRkaW5nIGEgbmV3IHJvdyBmb3IgdGhpcyBub2RlXHJcbiAgaERpZmYgPSBleHRyYUhlaWdodCArIG9yZ2FuaXphdGlvbi52ZXJ0aWNhbFBhZGRpbmc7XHJcbiAgdmFyIGFkZF9uZXdfcm93X3JhdGlvO1xyXG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggPCBleHRyYVdpZHRoKSB7XHJcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IChvcmdhbml6YXRpb24uaGVpZ2h0ICsgaERpZmYpIC8gZXh0cmFXaWR0aDtcclxuICB9IGVsc2Uge1xyXG4gICAgYWRkX25ld19yb3dfcmF0aW8gPSAob3JnYW5pemF0aW9uLmhlaWdodCArIGhEaWZmKSAvIG9yZ2FuaXphdGlvbi53aWR0aDtcclxuICB9XHJcblxyXG4gIGlmIChhZGRfbmV3X3Jvd19yYXRpbyA8IDEpXHJcbiAgICBhZGRfbmV3X3Jvd19yYXRpbyA9IDEgLyBhZGRfbmV3X3Jvd19yYXRpbztcclxuXHJcbiAgaWYgKGFkZF90b19yb3dfcmF0aW8gPCAxKVxyXG4gICAgYWRkX3RvX3Jvd19yYXRpbyA9IDEgLyBhZGRfdG9fcm93X3JhdGlvO1xyXG5cclxuICByZXR1cm4gYWRkX3RvX3Jvd19yYXRpbyA8IGFkZF9uZXdfcm93X3JhdGlvO1xyXG59O1xyXG5cclxuLy9JZiBtb3ZpbmcgdGhlIGxhc3Qgbm9kZSBmcm9tIHRoZSBsb25nZXN0IHJvdyBhbmQgYWRkaW5nIGl0IHRvIHRoZSBsYXN0XHJcbi8vcm93IG1ha2VzIHRoZSBib3VuZGluZyBib3ggc21hbGxlciwgZG8gaXQuXHJcbkNvU0VMYXlvdXQucHJvdG90eXBlLnNoaWZ0VG9MYXN0Um93ID0gZnVuY3Rpb24gKG9yZ2FuaXphdGlvbikge1xyXG4gIHZhciBsb25nZXN0ID0gdGhpcy5nZXRMb25nZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKTtcclxuICB2YXIgbGFzdCA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aC5sZW5ndGggLSAxO1xyXG4gIHZhciByb3cgPSBvcmdhbml6YXRpb24ucm93c1tsb25nZXN0XTtcclxuICB2YXIgbm9kZSA9IHJvd1tyb3cubGVuZ3RoIC0gMV07XHJcblxyXG4gIHZhciBkaWZmID0gbm9kZS53aWR0aCArIG9yZ2FuaXphdGlvbi5ob3Jpem9udGFsUGFkZGluZztcclxuXHJcbiAgLy8gQ2hlY2sgaWYgdGhlcmUgaXMgZW5vdWdoIHNwYWNlIG9uIHRoZSBsYXN0IHJvd1xyXG4gIGlmIChvcmdhbml6YXRpb24ud2lkdGggLSBvcmdhbml6YXRpb24ucm93V2lkdGhbbGFzdF0gPiBkaWZmICYmIGxvbmdlc3QgIT0gbGFzdCkge1xyXG4gICAgLy8gUmVtb3ZlIHRoZSBsYXN0IGVsZW1lbnQgb2YgdGhlIGxvbmdlc3Qgcm93XHJcbiAgICByb3cuc3BsaWNlKC0xLCAxKTtcclxuXHJcbiAgICAvLyBQdXNoIGl0IHRvIHRoZSBsYXN0IHJvd1xyXG4gICAgb3JnYW5pemF0aW9uLnJvd3NbbGFzdF0ucHVzaChub2RlKTtcclxuXHJcbiAgICBvcmdhbml6YXRpb24ucm93V2lkdGhbbG9uZ2VzdF0gPSBvcmdhbml6YXRpb24ucm93V2lkdGhbbG9uZ2VzdF0gLSBkaWZmO1xyXG4gICAgb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdID0gb3JnYW5pemF0aW9uLnJvd1dpZHRoW2xhc3RdICsgZGlmZjtcclxuICAgIG9yZ2FuaXphdGlvbi53aWR0aCA9IG9yZ2FuaXphdGlvbi5yb3dXaWR0aFtpbnN0YW5jZS5nZXRMb25nZXN0Um93SW5kZXgob3JnYW5pemF0aW9uKV07XHJcblxyXG4gICAgLy8gVXBkYXRlIGhlaWdodHMgb2YgdGhlIG9yZ2FuaXphdGlvblxyXG4gICAgdmFyIG1heEhlaWdodCA9IE51bWJlci5NSU5fVkFMVUU7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHJvdy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBpZiAocm93W2ldLmhlaWdodCA+IG1heEhlaWdodClcclxuICAgICAgICBtYXhIZWlnaHQgPSByb3dbaV0uaGVpZ2h0O1xyXG4gICAgfVxyXG4gICAgaWYgKGxvbmdlc3QgPiAwKVxyXG4gICAgICBtYXhIZWlnaHQgKz0gb3JnYW5pemF0aW9uLnZlcnRpY2FsUGFkZGluZztcclxuXHJcbiAgICB2YXIgcHJldlRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XHJcblxyXG4gICAgb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSA9IG1heEhlaWdodDtcclxuICAgIGlmIChvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdIDwgbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nKVxyXG4gICAgICBvcmdhbml6YXRpb24ucm93SGVpZ2h0W2xhc3RdID0gbm9kZS5oZWlnaHQgKyBvcmdhbml6YXRpb24udmVydGljYWxQYWRkaW5nO1xyXG5cclxuICAgIHZhciBmaW5hbFRvdGFsID0gb3JnYW5pemF0aW9uLnJvd0hlaWdodFtsb25nZXN0XSArIG9yZ2FuaXphdGlvbi5yb3dIZWlnaHRbbGFzdF07XHJcbiAgICBvcmdhbml6YXRpb24uaGVpZ2h0ICs9IChmaW5hbFRvdGFsIC0gcHJldlRvdGFsKTtcclxuXHJcbiAgICB0aGlzLnNoaWZ0VG9MYXN0Um93KG9yZ2FuaXphdGlvbik7XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsaW5nUHJlTGF5b3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgaWYgKENvU0VDb25zdGFudHMuVElMRSkge1xyXG4gICAgLy8gRmluZCB6ZXJvIGRlZ3JlZSBub2RlcyBhbmQgY3JlYXRlIGEgY29tcG91bmQgZm9yIGVhY2ggbGV2ZWxcclxuICAgIHRoaXMuZ3JvdXBaZXJvRGVncmVlTWVtYmVycygpO1xyXG4gICAgLy8gVGlsZSBhbmQgY2xlYXIgY2hpbGRyZW4gb2YgZWFjaCBjb21wb3VuZFxyXG4gICAgdGhpcy5jbGVhckNvbXBvdW5kcygpO1xyXG4gICAgLy8gU2VwYXJhdGVseSB0aWxlIGFuZCBjbGVhciB6ZXJvIGRlZ3JlZSBub2RlcyBmb3IgZWFjaCBsZXZlbFxyXG4gICAgdGhpcy5jbGVhclplcm9EZWdyZWVNZW1iZXJzKCk7XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRUxheW91dC5wcm90b3R5cGUudGlsaW5nUG9zdExheW91dCA9IGZ1bmN0aW9uKCkge1xyXG4gIGlmIChDb1NFQ29uc3RhbnRzLlRJTEUpIHtcclxuICAgIHRoaXMucmVwb3B1bGF0ZVplcm9EZWdyZWVNZW1iZXJzKCk7XHJcbiAgICB0aGlzLnJlcG9wdWxhdGVDb21wb3VuZHMoKTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENvU0VMYXlvdXQ7XHJcbiIsInZhciBGRExheW91dE5vZGUgPSByZXF1aXJlKCcuL0ZETGF5b3V0Tm9kZScpO1xyXG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XHJcblxyXG5mdW5jdGlvbiBDb1NFTm9kZShnbSwgbG9jLCBzaXplLCB2Tm9kZSkge1xyXG4gIEZETGF5b3V0Tm9kZS5jYWxsKHRoaXMsIGdtLCBsb2MsIHNpemUsIHZOb2RlKTtcclxufVxyXG5cclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRkRMYXlvdXROb2RlLnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gRkRMYXlvdXROb2RlKSB7XHJcbiAgQ29TRU5vZGVbcHJvcF0gPSBGRExheW91dE5vZGVbcHJvcF07XHJcbn1cclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBsYXlvdXQgPSB0aGlzLmdyYXBoTWFuYWdlci5nZXRMYXlvdXQoKTtcclxuICB0aGlzLmRpc3BsYWNlbWVudFggPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqXHJcbiAgICAgICAgICAodGhpcy5zcHJpbmdGb3JjZVggKyB0aGlzLnJlcHVsc2lvbkZvcmNlWCArIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVgpO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IGxheW91dC5jb29saW5nRmFjdG9yICpcclxuICAgICAgICAgICh0aGlzLnNwcmluZ0ZvcmNlWSArIHRoaXMucmVwdWxzaW9uRm9yY2VZICsgdGhpcy5ncmF2aXRhdGlvbkZvcmNlWSk7XHJcblxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRYKSA+IGxheW91dC5jb29saW5nRmFjdG9yICogbGF5b3V0Lm1heE5vZGVEaXNwbGFjZW1lbnQpXHJcbiAge1xyXG4gICAgdGhpcy5kaXNwbGFjZW1lbnRYID0gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudCAqXHJcbiAgICAgICAgICAgIElNYXRoLnNpZ24odGhpcy5kaXNwbGFjZW1lbnRYKTtcclxuICB9XHJcblxyXG4gIGlmIChNYXRoLmFicyh0aGlzLmRpc3BsYWNlbWVudFkpID4gbGF5b3V0LmNvb2xpbmdGYWN0b3IgKiBsYXlvdXQubWF4Tm9kZURpc3BsYWNlbWVudClcclxuICB7XHJcbiAgICB0aGlzLmRpc3BsYWNlbWVudFkgPSBsYXlvdXQuY29vbGluZ0ZhY3RvciAqIGxheW91dC5tYXhOb2RlRGlzcGxhY2VtZW50ICpcclxuICAgICAgICAgICAgSU1hdGguc2lnbih0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuXHJcbiAgLy8gYSBzaW1wbGUgbm9kZSwganVzdCBtb3ZlIGl0XHJcbiAgaWYgKHRoaXMuY2hpbGQgPT0gbnVsbClcclxuICB7XHJcbiAgICB0aGlzLm1vdmVCeSh0aGlzLmRpc3BsYWNlbWVudFgsIHRoaXMuZGlzcGxhY2VtZW50WSk7XHJcbiAgfVxyXG4gIC8vIGFuIGVtcHR5IGNvbXBvdW5kIG5vZGUsIGFnYWluIGp1c3QgbW92ZSBpdFxyXG4gIGVsc2UgaWYgKHRoaXMuY2hpbGQuZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcclxuICB7XHJcbiAgICB0aGlzLm1vdmVCeSh0aGlzLmRpc3BsYWNlbWVudFgsIHRoaXMuZGlzcGxhY2VtZW50WSk7XHJcbiAgfVxyXG4gIC8vIG5vbi1lbXB0eSBjb21wb3VuZCBub2RlLCBwcm9wb2dhdGUgbW92ZW1lbnQgdG8gY2hpbGRyZW4gYXMgd2VsbFxyXG4gIGVsc2VcclxuICB7XHJcbiAgICB0aGlzLnByb3BvZ2F0ZURpc3BsYWNlbWVudFRvQ2hpbGRyZW4odGhpcy5kaXNwbGFjZW1lbnRYLFxyXG4gICAgICAgICAgICB0aGlzLmRpc3BsYWNlbWVudFkpO1xyXG4gIH1cclxuXHJcbiAgbGF5b3V0LnRvdGFsRGlzcGxhY2VtZW50ICs9XHJcbiAgICAgICAgICBNYXRoLmFicyh0aGlzLmRpc3BsYWNlbWVudFgpICsgTWF0aC5hYnModGhpcy5kaXNwbGFjZW1lbnRZKTtcclxuXHJcbiAgdGhpcy5zcHJpbmdGb3JjZVggPSAwO1xyXG4gIHRoaXMuc3ByaW5nRm9yY2VZID0gMDtcclxuICB0aGlzLnJlcHVsc2lvbkZvcmNlWCA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVkgPSAwO1xyXG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMuZ3Jhdml0YXRpb25Gb3JjZVkgPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WCA9IDA7XHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRZID0gMDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuID0gZnVuY3Rpb24gKGRYLCBkWSlcclxue1xyXG4gIHZhciBub2RlcyA9IHRoaXMuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xyXG4gIHZhciBub2RlO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgbm9kZSA9IG5vZGVzW2ldO1xyXG4gICAgaWYgKG5vZGUuZ2V0Q2hpbGQoKSA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBub2RlLm1vdmVCeShkWCwgZFkpO1xyXG4gICAgICBub2RlLmRpc3BsYWNlbWVudFggKz0gZFg7XHJcbiAgICAgIG5vZGUuZGlzcGxhY2VtZW50WSArPSBkWTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgbm9kZS5wcm9wb2dhdGVEaXNwbGFjZW1lbnRUb0NoaWxkcmVuKGRYLCBkWSk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLnNldFByZWQxID0gZnVuY3Rpb24gKHByZWQxKVxyXG57XHJcbiAgdGhpcy5wcmVkMSA9IHByZWQxO1xyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLmdldFByZWQxID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBwcmVkMTtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5nZXRQcmVkMiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gcHJlZDI7XHJcbn07XHJcblxyXG5Db1NFTm9kZS5wcm90b3R5cGUuc2V0TmV4dCA9IGZ1bmN0aW9uIChuZXh0KVxyXG57XHJcbiAgdGhpcy5uZXh0ID0gbmV4dDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5nZXROZXh0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiBuZXh0O1xyXG59O1xyXG5cclxuQ29TRU5vZGUucHJvdG90eXBlLnNldFByb2Nlc3NlZCA9IGZ1bmN0aW9uIChwcm9jZXNzZWQpXHJcbntcclxuICB0aGlzLnByb2Nlc3NlZCA9IHByb2Nlc3NlZDtcclxufTtcclxuXHJcbkNvU0VOb2RlLnByb3RvdHlwZS5pc1Byb2Nlc3NlZCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gcHJvY2Vzc2VkO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb1NFTm9kZTtcclxuIiwiZnVuY3Rpb24gRGltZW5zaW9uRCh3aWR0aCwgaGVpZ2h0KSB7XHJcbiAgdGhpcy53aWR0aCA9IDA7XHJcbiAgdGhpcy5oZWlnaHQgPSAwO1xyXG4gIGlmICh3aWR0aCAhPT0gbnVsbCAmJiBoZWlnaHQgIT09IG51bGwpIHtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG4gIH1cclxufVxyXG5cclxuRGltZW5zaW9uRC5wcm90b3R5cGUuZ2V0V2lkdGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMud2lkdGg7XHJcbn07XHJcblxyXG5EaW1lbnNpb25ELnByb3RvdHlwZS5zZXRXaWR0aCA9IGZ1bmN0aW9uICh3aWR0aClcclxue1xyXG4gIHRoaXMud2lkdGggPSB3aWR0aDtcclxufTtcclxuXHJcbkRpbWVuc2lvbkQucHJvdG90eXBlLmdldEhlaWdodCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5oZWlnaHQ7XHJcbn07XHJcblxyXG5EaW1lbnNpb25ELnByb3RvdHlwZS5zZXRIZWlnaHQgPSBmdW5jdGlvbiAoaGVpZ2h0KVxyXG57XHJcbiAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IERpbWVuc2lvbkQ7XHJcbiIsImZ1bmN0aW9uIEVtaXR0ZXIoKXtcclxuICB0aGlzLmxpc3RlbmVycyA9IFtdO1xyXG59XHJcblxyXG52YXIgcCA9IEVtaXR0ZXIucHJvdG90eXBlO1xyXG5cclxucC5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKCBldmVudCwgY2FsbGJhY2sgKXtcclxuICB0aGlzLmxpc3RlbmVycy5wdXNoKHtcclxuICAgIGV2ZW50OiBldmVudCxcclxuICAgIGNhbGxiYWNrOiBjYWxsYmFja1xyXG4gIH0pO1xyXG59O1xyXG5cclxucC5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKCBldmVudCwgY2FsbGJhY2sgKXtcclxuICBmb3IoIHZhciBpID0gdGhpcy5saXN0ZW5lcnMubGVuZ3RoOyBpID49IDA7IGktLSApe1xyXG4gICAgdmFyIGwgPSB0aGlzLmxpc3RlbmVyc1tpXTtcclxuXHJcbiAgICBpZiggbC5ldmVudCA9PT0gZXZlbnQgJiYgbC5jYWxsYmFjayA9PT0gY2FsbGJhY2sgKXtcclxuICAgICAgdGhpcy5saXN0ZW5lcnMuc3BsaWNlKCBpLCAxICk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxucC5lbWl0ID0gZnVuY3Rpb24oIGV2ZW50LCBkYXRhICl7XHJcbiAgZm9yKCB2YXIgaSA9IDA7IGkgPCB0aGlzLmxpc3RlbmVycy5sZW5ndGg7IGkrKyApe1xyXG4gICAgdmFyIGwgPSB0aGlzLmxpc3RlbmVyc1tpXTtcclxuXHJcbiAgICBpZiggZXZlbnQgPT09IGwuZXZlbnQgKXtcclxuICAgICAgbC5jYWxsYmFjayggZGF0YSApO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcclxuIiwidmFyIExheW91dCA9IHJlcXVpcmUoJy4vTGF5b3V0Jyk7XHJcbnZhciBGRExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vRkRMYXlvdXRDb25zdGFudHMnKTtcclxudmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBJR2VvbWV0cnkgPSByZXF1aXJlKCcuL0lHZW9tZXRyeScpO1xyXG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XHJcblxyXG5mdW5jdGlvbiBGRExheW91dCgpIHtcclxuICBMYXlvdXQuY2FsbCh0aGlzKTtcclxuXHJcbiAgdGhpcy51c2VTbWFydElkZWFsRWRnZUxlbmd0aENhbGN1bGF0aW9uID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT047XHJcbiAgdGhpcy5pZGVhbEVkZ2VMZW5ndGggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIO1xyXG4gIHRoaXMuc3ByaW5nQ29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSDtcclxuICB0aGlzLnJlcHVsc2lvbkNvbnN0YW50ID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEg7XHJcbiAgdGhpcy5ncmF2aXR5Q29uc3RhbnQgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEg7XHJcbiAgdGhpcy5jb21wb3VuZEdyYXZpdHlDb25zdGFudCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9TVFJFTkdUSDtcclxuICB0aGlzLmdyYXZpdHlSYW5nZUZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XHJcbiAgdGhpcy5jb21wb3VuZEdyYXZpdHlSYW5nZUZhY3RvciA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1I7XHJcbiAgdGhpcy5kaXNwbGFjZW1lbnRUaHJlc2hvbGRQZXJOb2RlID0gKDMuMCAqIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEgpIC8gMTAwO1xyXG4gIHRoaXMuY29vbGluZ0ZhY3RvciA9IDEuMDtcclxuICB0aGlzLmluaXRpYWxDb29saW5nRmFjdG9yID0gMS4wO1xyXG4gIHRoaXMudG90YWxEaXNwbGFjZW1lbnQgPSAwLjA7XHJcbiAgdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCA9IDAuMDtcclxuICB0aGlzLm1heEl0ZXJhdGlvbnMgPSBGRExheW91dENvbnN0YW50cy5NQVhfSVRFUkFUSU9OUztcclxufVxyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMYXlvdXQucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTGF5b3V0KSB7XHJcbiAgRkRMYXlvdXRbcHJvcF0gPSBMYXlvdXRbcHJvcF07XHJcbn1cclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5pbml0UGFyYW1ldGVycyA9IGZ1bmN0aW9uICgpIHtcclxuICBMYXlvdXQucHJvdG90eXBlLmluaXRQYXJhbWV0ZXJzLmNhbGwodGhpcywgYXJndW1lbnRzKTtcclxuXHJcbiAgaWYgKHRoaXMubGF5b3V0UXVhbGl0eSA9PSBMYXlvdXRDb25zdGFudHMuRFJBRlRfUVVBTElUWSlcclxuICB7XHJcbiAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgKz0gMC4zMDtcclxuICAgIHRoaXMubWF4SXRlcmF0aW9ucyAqPSAwLjg7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHRoaXMubGF5b3V0UXVhbGl0eSA9PSBMYXlvdXRDb25zdGFudHMuUFJPT0ZfUVVBTElUWSlcclxuICB7XHJcbiAgICB0aGlzLmRpc3BsYWNlbWVudFRocmVzaG9sZFBlck5vZGUgLT0gMC4zMDtcclxuICAgIHRoaXMubWF4SXRlcmF0aW9ucyAqPSAxLjI7XHJcbiAgfVxyXG5cclxuICB0aGlzLnRvdGFsSXRlcmF0aW9ucyA9IDA7XHJcbiAgdGhpcy5ub3RBbmltYXRlZEl0ZXJhdGlvbnMgPSAwO1xyXG5cclxuLy8gICAgdGhpcy51c2VGUkdyaWRWYXJpYW50ID0gbGF5b3V0T3B0aW9uc1BhY2suc21hcnRSZXB1bHNpb25SYW5nZUNhbGM7XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY0lkZWFsRWRnZUxlbmd0aHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGVkZ2U7XHJcbiAgdmFyIGxjYURlcHRoO1xyXG4gIHZhciBzb3VyY2U7XHJcbiAgdmFyIHRhcmdldDtcclxuICB2YXIgc2l6ZU9mU291cmNlSW5MY2E7XHJcbiAgdmFyIHNpemVPZlRhcmdldEluTGNhO1xyXG5cclxuICB2YXIgYWxsRWRnZXMgPSB0aGlzLmdldEdyYXBoTWFuYWdlcigpLmdldEFsbEVkZ2VzKCk7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxFZGdlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBlZGdlID0gYWxsRWRnZXNbaV07XHJcblxyXG4gICAgZWRnZS5pZGVhbExlbmd0aCA9IHRoaXMuaWRlYWxFZGdlTGVuZ3RoO1xyXG5cclxuICAgIGlmIChlZGdlLmlzSW50ZXJHcmFwaClcclxuICAgIHtcclxuICAgICAgc291cmNlID0gZWRnZS5nZXRTb3VyY2UoKTtcclxuICAgICAgdGFyZ2V0ID0gZWRnZS5nZXRUYXJnZXQoKTtcclxuXHJcbiAgICAgIHNpemVPZlNvdXJjZUluTGNhID0gZWRnZS5nZXRTb3VyY2VJbkxjYSgpLmdldEVzdGltYXRlZFNpemUoKTtcclxuICAgICAgc2l6ZU9mVGFyZ2V0SW5MY2EgPSBlZGdlLmdldFRhcmdldEluTGNhKCkuZ2V0RXN0aW1hdGVkU2l6ZSgpO1xyXG5cclxuICAgICAgaWYgKHRoaXMudXNlU21hcnRJZGVhbEVkZ2VMZW5ndGhDYWxjdWxhdGlvbilcclxuICAgICAge1xyXG4gICAgICAgIGVkZ2UuaWRlYWxMZW5ndGggKz0gc2l6ZU9mU291cmNlSW5MY2EgKyBzaXplT2ZUYXJnZXRJbkxjYSAtXHJcbiAgICAgICAgICAgICAgICAyICogTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGxjYURlcHRoID0gZWRnZS5nZXRMY2EoKS5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKTtcclxuXHJcbiAgICAgIGVkZ2UuaWRlYWxMZW5ndGggKz0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCAqXHJcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiAqXHJcbiAgICAgICAgICAgICAgKHNvdXJjZS5nZXRJbmNsdXNpb25UcmVlRGVwdGgoKSArXHJcbiAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCkgLSAyICogbGNhRGVwdGgpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5pbml0U3ByaW5nRW1iZWRkZXIgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gIGlmICh0aGlzLmluY3JlbWVudGFsKVxyXG4gIHtcclxuICAgIHRoaXMuY29vbGluZ0ZhY3RvciA9IDAuODtcclxuICAgIHRoaXMuaW5pdGlhbENvb2xpbmdGYWN0b3IgPSAwLjg7XHJcbiAgICB0aGlzLm1heE5vZGVEaXNwbGFjZW1lbnQgPVxyXG4gICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlRfSU5DUkVNRU5UQUw7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICB0aGlzLmNvb2xpbmdGYWN0b3IgPSAxLjA7XHJcbiAgICB0aGlzLmluaXRpYWxDb29saW5nRmFjdG9yID0gMS4wO1xyXG4gICAgdGhpcy5tYXhOb2RlRGlzcGxhY2VtZW50ID1cclxuICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UO1xyXG4gIH1cclxuXHJcbiAgdGhpcy5tYXhJdGVyYXRpb25zID1cclxuICAgICAgICAgIE1hdGgubWF4KHRoaXMuZ2V0QWxsTm9kZXMoKS5sZW5ndGggKiA1LCB0aGlzLm1heEl0ZXJhdGlvbnMpO1xyXG5cclxuICB0aGlzLnRvdGFsRGlzcGxhY2VtZW50VGhyZXNob2xkID1cclxuICAgICAgICAgIHRoaXMuZGlzcGxhY2VtZW50VGhyZXNob2xkUGVyTm9kZSAqIHRoaXMuZ2V0QWxsTm9kZXMoKS5sZW5ndGg7XHJcblxyXG4gIHRoaXMucmVwdWxzaW9uUmFuZ2UgPSB0aGlzLmNhbGNSZXB1bHNpb25SYW5nZSgpO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNTcHJpbmdGb3JjZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIGxFZGdlcyA9IHRoaXMuZ2V0QWxsRWRnZXMoKTtcclxuICB2YXIgZWRnZTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgZWRnZSA9IGxFZGdlc1tpXTtcclxuXHJcbiAgICB0aGlzLmNhbGNTcHJpbmdGb3JjZShlZGdlLCBlZGdlLmlkZWFsTGVuZ3RoKTtcclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvbkZvcmNlcyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgaSwgajtcclxuICB2YXIgbm9kZUEsIG5vZGVCO1xyXG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XHJcblxyXG4gIGZvciAoaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgbm9kZUEgPSBsTm9kZXNbaV07XHJcblxyXG4gICAgZm9yIChqID0gaSArIDE7IGogPCBsTm9kZXMubGVuZ3RoOyBqKyspXHJcbiAgICB7XHJcbiAgICAgIG5vZGVCID0gbE5vZGVzW2pdO1xyXG5cclxuICAgICAgLy8gSWYgYm90aCBub2RlcyBhcmUgbm90IG1lbWJlcnMgb2YgdGhlIHNhbWUgZ3JhcGgsIHNraXAuXHJcbiAgICAgIGlmIChub2RlQS5nZXRPd25lcigpICE9IG5vZGVCLmdldE93bmVyKCkpXHJcbiAgICAgIHtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5jYWxjUmVwdWxzaW9uRm9yY2Uobm9kZUEsIG5vZGVCKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG5vZGU7XHJcbiAgdmFyIGxOb2RlcyA9IHRoaXMuZ2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24oKTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsTm9kZXMubGVuZ3RoOyBpKyspXHJcbiAge1xyXG4gICAgbm9kZSA9IGxOb2Rlc1tpXTtcclxuICAgIHRoaXMuY2FsY0dyYXZpdGF0aW9uYWxGb3JjZShub2RlKTtcclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUubW92ZU5vZGVzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBsTm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XHJcbiAgdmFyIG5vZGU7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbE5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIG5vZGUgPSBsTm9kZXNbaV07XHJcbiAgICBub2RlLm1vdmUoKTtcclxuICB9XHJcbn1cclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5jYWxjU3ByaW5nRm9yY2UgPSBmdW5jdGlvbiAoZWRnZSwgaWRlYWxMZW5ndGgpIHtcclxuICB2YXIgc291cmNlTm9kZSA9IGVkZ2UuZ2V0U291cmNlKCk7XHJcbiAgdmFyIHRhcmdldE5vZGUgPSBlZGdlLmdldFRhcmdldCgpO1xyXG5cclxuICB2YXIgbGVuZ3RoO1xyXG4gIHZhciBzcHJpbmdGb3JjZTtcclxuICB2YXIgc3ByaW5nRm9yY2VYO1xyXG4gIHZhciBzcHJpbmdGb3JjZVk7XHJcblxyXG4gIC8vIFVwZGF0ZSBlZGdlIGxlbmd0aFxyXG4gIGlmICh0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzICYmXHJcbiAgICAgICAgICBzb3VyY2VOb2RlLmdldENoaWxkKCkgPT0gbnVsbCAmJiB0YXJnZXROb2RlLmdldENoaWxkKCkgPT0gbnVsbClcclxuICB7XHJcbiAgICBlZGdlLnVwZGF0ZUxlbmd0aFNpbXBsZSgpO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgZWRnZS51cGRhdGVMZW5ndGgoKTtcclxuXHJcbiAgICBpZiAoZWRnZS5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxlbmd0aCA9IGVkZ2UuZ2V0TGVuZ3RoKCk7XHJcblxyXG4gIC8vIENhbGN1bGF0ZSBzcHJpbmcgZm9yY2VzXHJcbiAgc3ByaW5nRm9yY2UgPSB0aGlzLnNwcmluZ0NvbnN0YW50ICogKGxlbmd0aCAtIGlkZWFsTGVuZ3RoKTtcclxuXHJcbiAgLy8gUHJvamVjdCBmb3JjZSBvbnRvIHggYW5kIHkgYXhlc1xyXG4gIHNwcmluZ0ZvcmNlWCA9IHNwcmluZ0ZvcmNlICogKGVkZ2UubGVuZ3RoWCAvIGxlbmd0aCk7XHJcbiAgc3ByaW5nRm9yY2VZID0gc3ByaW5nRm9yY2UgKiAoZWRnZS5sZW5ndGhZIC8gbGVuZ3RoKTtcclxuXHJcbiAgLy8gQXBwbHkgZm9yY2VzIG9uIHRoZSBlbmQgbm9kZXNcclxuICBzb3VyY2VOb2RlLnNwcmluZ0ZvcmNlWCArPSBzcHJpbmdGb3JjZVg7XHJcbiAgc291cmNlTm9kZS5zcHJpbmdGb3JjZVkgKz0gc3ByaW5nRm9yY2VZO1xyXG4gIHRhcmdldE5vZGUuc3ByaW5nRm9yY2VYIC09IHNwcmluZ0ZvcmNlWDtcclxuICB0YXJnZXROb2RlLnNwcmluZ0ZvcmNlWSAtPSBzcHJpbmdGb3JjZVk7XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvbkZvcmNlID0gZnVuY3Rpb24gKG5vZGVBLCBub2RlQikge1xyXG4gIHZhciByZWN0QSA9IG5vZGVBLmdldFJlY3QoKTtcclxuICB2YXIgcmVjdEIgPSBub2RlQi5nZXRSZWN0KCk7XHJcbiAgdmFyIG92ZXJsYXBBbW91bnQgPSBuZXcgQXJyYXkoMik7XHJcbiAgdmFyIGNsaXBQb2ludHMgPSBuZXcgQXJyYXkoNCk7XHJcbiAgdmFyIGRpc3RhbmNlWDtcclxuICB2YXIgZGlzdGFuY2VZO1xyXG4gIHZhciBkaXN0YW5jZVNxdWFyZWQ7XHJcbiAgdmFyIGRpc3RhbmNlO1xyXG4gIHZhciByZXB1bHNpb25Gb3JjZTtcclxuICB2YXIgcmVwdWxzaW9uRm9yY2VYO1xyXG4gIHZhciByZXB1bHNpb25Gb3JjZVk7XHJcblxyXG4gIGlmIChyZWN0QS5pbnRlcnNlY3RzKHJlY3RCKSkvLyB0d28gbm9kZXMgb3ZlcmxhcFxyXG4gIHtcclxuICAgIC8vIGNhbGN1bGF0ZSBzZXBhcmF0aW9uIGFtb3VudCBpbiB4IGFuZCB5IGRpcmVjdGlvbnNcclxuICAgIElHZW9tZXRyeS5jYWxjU2VwYXJhdGlvbkFtb3VudChyZWN0QSxcclxuICAgICAgICAgICAgcmVjdEIsXHJcbiAgICAgICAgICAgIG92ZXJsYXBBbW91bnQsXHJcbiAgICAgICAgICAgIEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggLyAyLjApO1xyXG5cclxuICAgIHJlcHVsc2lvbkZvcmNlWCA9IG92ZXJsYXBBbW91bnRbMF07XHJcbiAgICByZXB1bHNpb25Gb3JjZVkgPSBvdmVybGFwQW1vdW50WzFdO1xyXG4gIH1cclxuICBlbHNlLy8gbm8gb3ZlcmxhcFxyXG4gIHtcclxuICAgIC8vIGNhbGN1bGF0ZSBkaXN0YW5jZVxyXG5cclxuICAgIGlmICh0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzICYmXHJcbiAgICAgICAgICAgIG5vZGVBLmdldENoaWxkKCkgPT0gbnVsbCAmJiBub2RlQi5nZXRDaGlsZCgpID09IG51bGwpLy8gc2ltcGx5IGJhc2UgcmVwdWxzaW9uIG9uIGRpc3RhbmNlIG9mIG5vZGUgY2VudGVyc1xyXG4gICAge1xyXG4gICAgICBkaXN0YW5jZVggPSByZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCk7XHJcbiAgICAgIGRpc3RhbmNlWSA9IHJlY3RCLmdldENlbnRlclkoKSAtIHJlY3RBLmdldENlbnRlclkoKTtcclxuICAgIH1cclxuICAgIGVsc2UvLyB1c2UgY2xpcHBpbmcgcG9pbnRzXHJcbiAgICB7XHJcbiAgICAgIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24ocmVjdEEsIHJlY3RCLCBjbGlwUG9pbnRzKTtcclxuXHJcbiAgICAgIGRpc3RhbmNlWCA9IGNsaXBQb2ludHNbMl0gLSBjbGlwUG9pbnRzWzBdO1xyXG4gICAgICBkaXN0YW5jZVkgPSBjbGlwUG9pbnRzWzNdIC0gY2xpcFBvaW50c1sxXTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBObyByZXB1bHNpb24gcmFuZ2UuIEZSIGdyaWQgdmFyaWFudCBzaG91bGQgdGFrZSBjYXJlIG9mIHRoaXMuXHJcbiAgICBpZiAoTWF0aC5hYnMoZGlzdGFuY2VYKSA8IEZETGF5b3V0Q29uc3RhbnRzLk1JTl9SRVBVTFNJT05fRElTVClcclxuICAgIHtcclxuICAgICAgZGlzdGFuY2VYID0gSU1hdGguc2lnbihkaXN0YW5jZVgpICpcclxuICAgICAgICAgICAgICBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1Q7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKE1hdGguYWJzKGRpc3RhbmNlWSkgPCBGRExheW91dENvbnN0YW50cy5NSU5fUkVQVUxTSU9OX0RJU1QpXHJcbiAgICB7XHJcbiAgICAgIGRpc3RhbmNlWSA9IElNYXRoLnNpZ24oZGlzdGFuY2VZKSAqXHJcbiAgICAgICAgICAgICAgRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUO1xyXG4gICAgfVxyXG5cclxuICAgIGRpc3RhbmNlU3F1YXJlZCA9IGRpc3RhbmNlWCAqIGRpc3RhbmNlWCArIGRpc3RhbmNlWSAqIGRpc3RhbmNlWTtcclxuICAgIGRpc3RhbmNlID0gTWF0aC5zcXJ0KGRpc3RhbmNlU3F1YXJlZCk7XHJcblxyXG4gICAgcmVwdWxzaW9uRm9yY2UgPSB0aGlzLnJlcHVsc2lvbkNvbnN0YW50IC8gZGlzdGFuY2VTcXVhcmVkO1xyXG5cclxuICAgIC8vIFByb2plY3QgZm9yY2Ugb250byB4IGFuZCB5IGF4ZXNcclxuICAgIHJlcHVsc2lvbkZvcmNlWCA9IHJlcHVsc2lvbkZvcmNlICogZGlzdGFuY2VYIC8gZGlzdGFuY2U7XHJcbiAgICByZXB1bHNpb25Gb3JjZVkgPSByZXB1bHNpb25Gb3JjZSAqIGRpc3RhbmNlWSAvIGRpc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgLy8gQXBwbHkgZm9yY2VzIG9uIHRoZSB0d28gbm9kZXNcclxuICBub2RlQS5yZXB1bHNpb25Gb3JjZVggLT0gcmVwdWxzaW9uRm9yY2VYO1xyXG4gIG5vZGVBLnJlcHVsc2lvbkZvcmNlWSAtPSByZXB1bHNpb25Gb3JjZVk7XHJcbiAgbm9kZUIucmVwdWxzaW9uRm9yY2VYICs9IHJlcHVsc2lvbkZvcmNlWDtcclxuICBub2RlQi5yZXB1bHNpb25Gb3JjZVkgKz0gcmVwdWxzaW9uRm9yY2VZO1xyXG59O1xyXG5cclxuRkRMYXlvdXQucHJvdG90eXBlLmNhbGNHcmF2aXRhdGlvbmFsRm9yY2UgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBvd25lckdyYXBoO1xyXG4gIHZhciBvd25lckNlbnRlclg7XHJcbiAgdmFyIG93bmVyQ2VudGVyWTtcclxuICB2YXIgZGlzdGFuY2VYO1xyXG4gIHZhciBkaXN0YW5jZVk7XHJcbiAgdmFyIGFic0Rpc3RhbmNlWDtcclxuICB2YXIgYWJzRGlzdGFuY2VZO1xyXG4gIHZhciBlc3RpbWF0ZWRTaXplO1xyXG4gIG93bmVyR3JhcGggPSBub2RlLmdldE93bmVyKCk7XHJcblxyXG4gIG93bmVyQ2VudGVyWCA9IChvd25lckdyYXBoLmdldFJpZ2h0KCkgKyBvd25lckdyYXBoLmdldExlZnQoKSkgLyAyO1xyXG4gIG93bmVyQ2VudGVyWSA9IChvd25lckdyYXBoLmdldFRvcCgpICsgb3duZXJHcmFwaC5nZXRCb3R0b20oKSkgLyAyO1xyXG4gIGRpc3RhbmNlWCA9IG5vZGUuZ2V0Q2VudGVyWCgpIC0gb3duZXJDZW50ZXJYO1xyXG4gIGRpc3RhbmNlWSA9IG5vZGUuZ2V0Q2VudGVyWSgpIC0gb3duZXJDZW50ZXJZO1xyXG4gIGFic0Rpc3RhbmNlWCA9IE1hdGguYWJzKGRpc3RhbmNlWCk7XHJcbiAgYWJzRGlzdGFuY2VZID0gTWF0aC5hYnMoZGlzdGFuY2VZKTtcclxuXHJcbiAgaWYgKG5vZGUuZ2V0T3duZXIoKSA9PSB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkpLy8gaW4gdGhlIHJvb3QgZ3JhcGhcclxuICB7XHJcbiAgICBNYXRoLmZsb29yKDgwKTtcclxuICAgIGVzdGltYXRlZFNpemUgPSBNYXRoLmZsb29yKG93bmVyR3JhcGguZ2V0RXN0aW1hdGVkU2l6ZSgpICpcclxuICAgICAgICAgICAgdGhpcy5ncmF2aXR5UmFuZ2VGYWN0b3IpO1xyXG5cclxuICAgIGlmIChhYnNEaXN0YW5jZVggPiBlc3RpbWF0ZWRTaXplIHx8IGFic0Rpc3RhbmNlWSA+IGVzdGltYXRlZFNpemUpXHJcbiAgICB7XHJcbiAgICAgIG5vZGUuZ3Jhdml0YXRpb25Gb3JjZVggPSAtdGhpcy5ncmF2aXR5Q29uc3RhbnQgKiBkaXN0YW5jZVg7XHJcbiAgICAgIG5vZGUuZ3Jhdml0YXRpb25Gb3JjZVkgPSAtdGhpcy5ncmF2aXR5Q29uc3RhbnQgKiBkaXN0YW5jZVk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2UvLyBpbnNpZGUgYSBjb21wb3VuZFxyXG4gIHtcclxuICAgIGVzdGltYXRlZFNpemUgPSBNYXRoLmZsb29yKChvd25lckdyYXBoLmdldEVzdGltYXRlZFNpemUoKSAqXHJcbiAgICAgICAgICAgIHRoaXMuY29tcG91bmRHcmF2aXR5UmFuZ2VGYWN0b3IpKTtcclxuXHJcbiAgICBpZiAoYWJzRGlzdGFuY2VYID4gZXN0aW1hdGVkU2l6ZSB8fCBhYnNEaXN0YW5jZVkgPiBlc3RpbWF0ZWRTaXplKVxyXG4gICAge1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VYID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VYICpcclxuICAgICAgICAgICAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eUNvbnN0YW50O1xyXG4gICAgICBub2RlLmdyYXZpdGF0aW9uRm9yY2VZID0gLXRoaXMuZ3Jhdml0eUNvbnN0YW50ICogZGlzdGFuY2VZICpcclxuICAgICAgICAgICAgICB0aGlzLmNvbXBvdW5kR3Jhdml0eUNvbnN0YW50O1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5pc0NvbnZlcmdlZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY29udmVyZ2VkO1xyXG4gIHZhciBvc2NpbGF0aW5nID0gZmFsc2U7XHJcblxyXG4gIGlmICh0aGlzLnRvdGFsSXRlcmF0aW9ucyA+IHRoaXMubWF4SXRlcmF0aW9ucyAvIDMpXHJcbiAge1xyXG4gICAgb3NjaWxhdGluZyA9XHJcbiAgICAgICAgICAgIE1hdGguYWJzKHRoaXMudG90YWxEaXNwbGFjZW1lbnQgLSB0aGlzLm9sZFRvdGFsRGlzcGxhY2VtZW50KSA8IDI7XHJcbiAgfVxyXG5cclxuICBjb252ZXJnZWQgPSB0aGlzLnRvdGFsRGlzcGxhY2VtZW50IDwgdGhpcy50b3RhbERpc3BsYWNlbWVudFRocmVzaG9sZDtcclxuXHJcbiAgdGhpcy5vbGRUb3RhbERpc3BsYWNlbWVudCA9IHRoaXMudG90YWxEaXNwbGFjZW1lbnQ7XHJcblxyXG4gIHJldHVybiBjb252ZXJnZWQgfHwgb3NjaWxhdGluZztcclxufTtcclxuXHJcbkZETGF5b3V0LnByb3RvdHlwZS5hbmltYXRlID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0aGlzLmFuaW1hdGlvbkR1cmluZ0xheW91dCAmJiAhdGhpcy5pc1N1YkxheW91dClcclxuICB7XHJcbiAgICBpZiAodGhpcy5ub3RBbmltYXRlZEl0ZXJhdGlvbnMgPT0gdGhpcy5hbmltYXRpb25QZXJpb2QpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgIHRoaXMubm90QW5pbWF0ZWRJdGVyYXRpb25zID0gMDtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgdGhpcy5ub3RBbmltYXRlZEl0ZXJhdGlvbnMrKztcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5GRExheW91dC5wcm90b3R5cGUuY2FsY1JlcHVsc2lvblJhbmdlID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiAwLjA7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEZETGF5b3V0O1xyXG4iLCJ2YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxuXHJcbmZ1bmN0aW9uIEZETGF5b3V0Q29uc3RhbnRzKCkge1xyXG59XHJcblxyXG4vL0ZETGF5b3V0Q29uc3RhbnRzIGluaGVyaXRzIHN0YXRpYyBwcm9wcyBpbiBMYXlvdXRDb25zdGFudHNcclxuZm9yICh2YXIgcHJvcCBpbiBMYXlvdXRDb25zdGFudHMpIHtcclxuICBGRExheW91dENvbnN0YW50c1twcm9wXSA9IExheW91dENvbnN0YW50c1twcm9wXTtcclxufVxyXG5cclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlMgPSAyNTAwO1xyXG5cclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCA9IDUwO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSCA9IDAuNDU7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gNDUwMC4wO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX0dSQVZJVFlfU1RSRU5HVEggPSAwLjQ7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9TVFJFTkdUSCA9IDEuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDMuODtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DT01QT1VORF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IDEuNTtcclxuRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9VU0VfU01BUlRfSURFQUxfRURHRV9MRU5HVEhfQ0FMQ1VMQVRJT04gPSB0cnVlO1xyXG5GRExheW91dENvbnN0YW50cy5ERUZBVUxUX1VTRV9TTUFSVF9SRVBVTFNJT05fUkFOR0VfQ0FMQ1VMQVRJT04gPSB0cnVlO1xyXG5GRExheW91dENvbnN0YW50cy5NQVhfTk9ERV9ESVNQTEFDRU1FTlRfSU5DUkVNRU5UQUwgPSAxMDAuMDtcclxuRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX05PREVfRElTUExBQ0VNRU5UX0lOQ1JFTUVOVEFMICogMztcclxuRkRMYXlvdXRDb25zdGFudHMuTUlOX1JFUFVMU0lPTl9ESVNUID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSCAvIDEwLjA7XHJcbkZETGF5b3V0Q29uc3RhbnRzLkNPTlZFUkdFTkNFX0NIRUNLX1BFUklPRCA9IDEwMDtcclxuRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IDAuMTtcclxuRkRMYXlvdXRDb25zdGFudHMuTUlOX0VER0VfTEVOR1RIID0gMTtcclxuRkRMYXlvdXRDb25zdGFudHMuR1JJRF9DQUxDVUxBVElPTl9DSEVDS19QRVJJT0QgPSAxMDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gRkRMYXlvdXRDb25zdGFudHM7XHJcbiIsInZhciBMRWRnZSA9IHJlcXVpcmUoJy4vTEVkZ2UnKTtcclxudmFyIEZETGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9GRExheW91dENvbnN0YW50cycpO1xyXG5cclxuZnVuY3Rpb24gRkRMYXlvdXRFZGdlKHNvdXJjZSwgdGFyZ2V0LCB2RWRnZSkge1xyXG4gIExFZGdlLmNhbGwodGhpcywgc291cmNlLCB0YXJnZXQsIHZFZGdlKTtcclxuICB0aGlzLmlkZWFsTGVuZ3RoID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9FREdFX0xFTkdUSDtcclxufVxyXG5cclxuRkRMYXlvdXRFZGdlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEVkZ2UucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTEVkZ2UpIHtcclxuICBGRExheW91dEVkZ2VbcHJvcF0gPSBMRWRnZVtwcm9wXTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dEVkZ2U7XHJcbiIsInZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxuXHJcbmZ1bmN0aW9uIEZETGF5b3V0Tm9kZShnbSwgbG9jLCBzaXplLCB2Tm9kZSkge1xyXG4gIC8vIGFsdGVybmF0aXZlIGNvbnN0cnVjdG9yIGlzIGhhbmRsZWQgaW5zaWRlIExOb2RlXHJcbiAgTE5vZGUuY2FsbCh0aGlzLCBnbSwgbG9jLCBzaXplLCB2Tm9kZSk7XHJcbiAgLy9TcHJpbmcsIHJlcHVsc2lvbiBhbmQgZ3Jhdml0YXRpb25hbCBmb3JjZXMgYWN0aW5nIG9uIHRoaXMgbm9kZVxyXG4gIHRoaXMuc3ByaW5nRm9yY2VYID0gMDtcclxuICB0aGlzLnNwcmluZ0ZvcmNlWSA9IDA7XHJcbiAgdGhpcy5yZXB1bHNpb25Gb3JjZVggPSAwO1xyXG4gIHRoaXMucmVwdWxzaW9uRm9yY2VZID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VYID0gMDtcclxuICB0aGlzLmdyYXZpdGF0aW9uRm9yY2VZID0gMDtcclxuICAvL0Ftb3VudCBieSB3aGljaCB0aGlzIG5vZGUgaXMgdG8gYmUgbW92ZWQgaW4gdGhpcyBpdGVyYXRpb25cclxuICB0aGlzLmRpc3BsYWNlbWVudFggPSAwO1xyXG4gIHRoaXMuZGlzcGxhY2VtZW50WSA9IDA7XHJcblxyXG4gIC8vU3RhcnQgYW5kIGZpbmlzaCBncmlkIGNvb3JkaW5hdGVzIHRoYXQgdGhpcyBub2RlIGlzIGZhbGxlbiBpbnRvXHJcbiAgdGhpcy5zdGFydFggPSAwO1xyXG4gIHRoaXMuZmluaXNoWCA9IDA7XHJcbiAgdGhpcy5zdGFydFkgPSAwO1xyXG4gIHRoaXMuZmluaXNoWSA9IDA7XHJcblxyXG4gIC8vR2VvbWV0cmljIG5laWdoYm9ycyBvZiB0aGlzIG5vZGVcclxuICB0aGlzLnN1cnJvdW5kaW5nID0gW107XHJcbn1cclxuXHJcbkZETGF5b3V0Tm9kZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKExOb2RlLnByb3RvdHlwZSk7XHJcblxyXG5mb3IgKHZhciBwcm9wIGluIExOb2RlKSB7XHJcbiAgRkRMYXlvdXROb2RlW3Byb3BdID0gTE5vZGVbcHJvcF07XHJcbn1cclxuXHJcbkZETGF5b3V0Tm9kZS5wcm90b3R5cGUuc2V0R3JpZENvb3JkaW5hdGVzID0gZnVuY3Rpb24gKF9zdGFydFgsIF9maW5pc2hYLCBfc3RhcnRZLCBfZmluaXNoWSlcclxue1xyXG4gIHRoaXMuc3RhcnRYID0gX3N0YXJ0WDtcclxuICB0aGlzLmZpbmlzaFggPSBfZmluaXNoWDtcclxuICB0aGlzLnN0YXJ0WSA9IF9zdGFydFk7XHJcbiAgdGhpcy5maW5pc2hZID0gX2ZpbmlzaFk7XHJcblxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBGRExheW91dE5vZGU7XHJcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxuXHJcbmZ1bmN0aW9uIEhhc2hNYXAoKSB7XHJcbiAgdGhpcy5tYXAgPSB7fTtcclxuICB0aGlzLmtleXMgPSBbXTtcclxufVxyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUucHV0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChrZXkpO1xyXG4gIGlmICghdGhpcy5jb250YWlucyh0aGVJZCkpIHtcclxuICAgIHRoaXMubWFwW3RoZUlkXSA9IHZhbHVlO1xyXG4gICAgdGhpcy5rZXlzLnB1c2goa2V5KTtcclxuICB9XHJcbn07XHJcblxyXG5IYXNoTWFwLnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICB2YXIgdGhlSWQgPSBVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChrZXkpO1xyXG4gIHJldHVybiB0aGlzLm1hcFtrZXldICE9IG51bGw7XHJcbn07XHJcblxyXG5IYXNoTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQoa2V5KTtcclxuICByZXR1cm4gdGhpcy5tYXBbdGhlSWRdO1xyXG59O1xyXG5cclxuSGFzaE1hcC5wcm90b3R5cGUua2V5U2V0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmtleXM7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hNYXA7XHJcbiIsInZhciBVbmlxdWVJREdlbmVyZXRvciA9IHJlcXVpcmUoJy4vVW5pcXVlSURHZW5lcmV0b3InKTtcclxuXHJcbmZ1bmN0aW9uIEhhc2hTZXQoKSB7XHJcbiAgdGhpcy5zZXQgPSB7fTtcclxufVxyXG47XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgdmFyIHRoZUlkID0gVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKTtcclxuICBpZiAoIXRoaXMuY29udGFpbnModGhlSWQpKVxyXG4gICAgdGhpcy5zZXRbdGhlSWRdID0gb2JqO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGRlbGV0ZSB0aGlzLnNldFtVbmlxdWVJREdlbmVyZXRvci5jcmVhdGVJRChvYmopXTtcclxufTtcclxuXHJcbkhhc2hTZXQucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuc2V0ID0ge307XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChvYmopIHtcclxuICByZXR1cm4gdGhpcy5zZXRbVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQob2JqKV0gPT0gb2JqO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuaXNFbXB0eSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5zaXplKCkgPT09IDA7XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xyXG59O1xyXG5cclxuLy9jb25jYXRzIHRoaXMuc2V0IHRvIHRoZSBnaXZlbiBsaXN0XHJcbkhhc2hTZXQucHJvdG90eXBlLmFkZEFsbFRvID0gZnVuY3Rpb24gKGxpc3QpIHtcclxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuc2V0KTtcclxuICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xyXG4gICAgbGlzdC5wdXNoKHRoaXMuc2V0W2tleXNbaV1dKTtcclxuICB9XHJcbn07XHJcblxyXG5IYXNoU2V0LnByb3RvdHlwZS5zaXplID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBPYmplY3Qua2V5cyh0aGlzLnNldCkubGVuZ3RoO1xyXG59O1xyXG5cclxuSGFzaFNldC5wcm90b3R5cGUuYWRkQWxsID0gZnVuY3Rpb24gKGxpc3QpIHtcclxuICB2YXIgcyA9IGxpc3QubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKSB7XHJcbiAgICB2YXIgdiA9IGxpc3RbaV07XHJcbiAgICB0aGlzLmFkZCh2KTtcclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEhhc2hTZXQ7XHJcbiIsImZ1bmN0aW9uIElHZW9tZXRyeSgpIHtcclxufVxyXG5cclxuSUdlb21ldHJ5LmNhbGNTZXBhcmF0aW9uQW1vdW50ID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0Qiwgb3ZlcmxhcEFtb3VudCwgc2VwYXJhdGlvbkJ1ZmZlcilcclxue1xyXG4gIGlmICghcmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICB2YXIgZGlyZWN0aW9ucyA9IG5ldyBBcnJheSgyKTtcclxuICBJR2VvbWV0cnkuZGVjaWRlRGlyZWN0aW9uc0Zvck92ZXJsYXBwaW5nTm9kZXMocmVjdEEsIHJlY3RCLCBkaXJlY3Rpb25zKTtcclxuICBvdmVybGFwQW1vdW50WzBdID0gTWF0aC5taW4ocmVjdEEuZ2V0UmlnaHQoKSwgcmVjdEIuZ2V0UmlnaHQoKSkgLVxyXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueCwgcmVjdEIueCk7XHJcbiAgb3ZlcmxhcEFtb3VudFsxXSA9IE1hdGgubWluKHJlY3RBLmdldEJvdHRvbSgpLCByZWN0Qi5nZXRCb3R0b20oKSkgLVxyXG4gICAgICAgICAgTWF0aC5tYXgocmVjdEEueSwgcmVjdEIueSk7XHJcbiAgLy8gdXBkYXRlIHRoZSBvdmVybGFwcGluZyBhbW91bnRzIGZvciB0aGUgZm9sbG93aW5nIGNhc2VzOlxyXG4gIGlmICgocmVjdEEuZ2V0WCgpIDw9IHJlY3RCLmdldFgoKSkgJiYgKHJlY3RBLmdldFJpZ2h0KCkgPj0gcmVjdEIuZ2V0UmlnaHQoKSkpXHJcbiAge1xyXG4gICAgb3ZlcmxhcEFtb3VudFswXSArPSBNYXRoLm1pbigocmVjdEIuZ2V0WCgpIC0gcmVjdEEuZ2V0WCgpKSxcclxuICAgICAgICAgICAgKHJlY3RBLmdldFJpZ2h0KCkgLSByZWN0Qi5nZXRSaWdodCgpKSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRYKCkgPD0gcmVjdEEuZ2V0WCgpKSAmJiAocmVjdEIuZ2V0UmlnaHQoKSA+PSByZWN0QS5nZXRSaWdodCgpKSlcclxuICB7XHJcbiAgICBvdmVybGFwQW1vdW50WzBdICs9IE1hdGgubWluKChyZWN0QS5nZXRYKCkgLSByZWN0Qi5nZXRYKCkpLFxyXG4gICAgICAgICAgICAocmVjdEIuZ2V0UmlnaHQoKSAtIHJlY3RBLmdldFJpZ2h0KCkpKTtcclxuICB9XHJcbiAgaWYgKChyZWN0QS5nZXRZKCkgPD0gcmVjdEIuZ2V0WSgpKSAmJiAocmVjdEEuZ2V0Qm90dG9tKCkgPj0gcmVjdEIuZ2V0Qm90dG9tKCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RCLmdldFkoKSAtIHJlY3RBLmdldFkoKSksXHJcbiAgICAgICAgICAgIChyZWN0QS5nZXRCb3R0b20oKSAtIHJlY3RCLmdldEJvdHRvbSgpKSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKChyZWN0Qi5nZXRZKCkgPD0gcmVjdEEuZ2V0WSgpKSAmJiAocmVjdEIuZ2V0Qm90dG9tKCkgPj0gcmVjdEEuZ2V0Qm90dG9tKCkpKVxyXG4gIHtcclxuICAgIG92ZXJsYXBBbW91bnRbMV0gKz0gTWF0aC5taW4oKHJlY3RBLmdldFkoKSAtIHJlY3RCLmdldFkoKSksXHJcbiAgICAgICAgICAgIChyZWN0Qi5nZXRCb3R0b20oKSAtIHJlY3RBLmdldEJvdHRvbSgpKSk7XHJcbiAgfVxyXG5cclxuICAvLyBmaW5kIHNsb3BlIG9mIHRoZSBsaW5lIHBhc3NlcyB0d28gY2VudGVyc1xyXG4gIHZhciBzbG9wZSA9IE1hdGguYWJzKChyZWN0Qi5nZXRDZW50ZXJZKCkgLSByZWN0QS5nZXRDZW50ZXJZKCkpIC9cclxuICAgICAgICAgIChyZWN0Qi5nZXRDZW50ZXJYKCkgLSByZWN0QS5nZXRDZW50ZXJYKCkpKTtcclxuICAvLyBpZiBjZW50ZXJzIGFyZSBvdmVybGFwcGVkXHJcbiAgaWYgKChyZWN0Qi5nZXRDZW50ZXJZKCkgPT0gcmVjdEEuZ2V0Q2VudGVyWSgpKSAmJlxyXG4gICAgICAgICAgKHJlY3RCLmdldENlbnRlclgoKSA9PSByZWN0QS5nZXRDZW50ZXJYKCkpKVxyXG4gIHtcclxuICAgIC8vIGFzc3VtZSB0aGUgc2xvcGUgaXMgMSAoNDUgZGVncmVlKVxyXG4gICAgc2xvcGUgPSAxLjA7XHJcbiAgfVxyXG5cclxuICB2YXIgbW92ZUJ5WSA9IHNsb3BlICogb3ZlcmxhcEFtb3VudFswXTtcclxuICB2YXIgbW92ZUJ5WCA9IG92ZXJsYXBBbW91bnRbMV0gLyBzbG9wZTtcclxuICBpZiAob3ZlcmxhcEFtb3VudFswXSA8IG1vdmVCeVgpXHJcbiAge1xyXG4gICAgbW92ZUJ5WCA9IG92ZXJsYXBBbW91bnRbMF07XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICBtb3ZlQnlZID0gb3ZlcmxhcEFtb3VudFsxXTtcclxuICB9XHJcbiAgLy8gcmV0dXJuIGhhbGYgdGhlIGFtb3VudCBzbyB0aGF0IGlmIGVhY2ggcmVjdGFuZ2xlIGlzIG1vdmVkIGJ5IHRoZXNlXHJcbiAgLy8gYW1vdW50cyBpbiBvcHBvc2l0ZSBkaXJlY3Rpb25zLCBvdmVybGFwIHdpbGwgYmUgcmVzb2x2ZWRcclxuICBvdmVybGFwQW1vdW50WzBdID0gLTEgKiBkaXJlY3Rpb25zWzBdICogKChtb3ZlQnlYIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcclxuICBvdmVybGFwQW1vdW50WzFdID0gLTEgKiBkaXJlY3Rpb25zWzFdICogKChtb3ZlQnlZIC8gMikgKyBzZXBhcmF0aW9uQnVmZmVyKTtcclxufVxyXG5cclxuSUdlb21ldHJ5LmRlY2lkZURpcmVjdGlvbnNGb3JPdmVybGFwcGluZ05vZGVzID0gZnVuY3Rpb24gKHJlY3RBLCByZWN0QiwgZGlyZWN0aW9ucylcclxue1xyXG4gIGlmIChyZWN0QS5nZXRDZW50ZXJYKCkgPCByZWN0Qi5nZXRDZW50ZXJYKCkpXHJcbiAge1xyXG4gICAgZGlyZWN0aW9uc1swXSA9IC0xO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgZGlyZWN0aW9uc1swXSA9IDE7XHJcbiAgfVxyXG5cclxuICBpZiAocmVjdEEuZ2V0Q2VudGVyWSgpIDwgcmVjdEIuZ2V0Q2VudGVyWSgpKVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMV0gPSAtMTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGRpcmVjdGlvbnNbMV0gPSAxO1xyXG4gIH1cclxufVxyXG5cclxuSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbjIgPSBmdW5jdGlvbiAocmVjdEEsIHJlY3RCLCByZXN1bHQpXHJcbntcclxuICAvL3Jlc3VsdFswLTFdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEEsIHJlc3VsdFsyLTNdIHdpbGwgY29udGFpbiBjbGlwUG9pbnQgb2YgcmVjdEJcclxuICB2YXIgcDF4ID0gcmVjdEEuZ2V0Q2VudGVyWCgpO1xyXG4gIHZhciBwMXkgPSByZWN0QS5nZXRDZW50ZXJZKCk7XHJcbiAgdmFyIHAyeCA9IHJlY3RCLmdldENlbnRlclgoKTtcclxuICB2YXIgcDJ5ID0gcmVjdEIuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICAvL2lmIHR3byByZWN0YW5nbGVzIGludGVyc2VjdCwgdGhlbiBjbGlwcGluZyBwb2ludHMgYXJlIGNlbnRlcnNcclxuICBpZiAocmVjdEEuaW50ZXJzZWN0cyhyZWN0QikpXHJcbiAge1xyXG4gICAgcmVzdWx0WzBdID0gcDF4O1xyXG4gICAgcmVzdWx0WzFdID0gcDF5O1xyXG4gICAgcmVzdWx0WzJdID0gcDJ4O1xyXG4gICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIC8vdmFyaWFibGVzIGZvciByZWN0QVxyXG4gIHZhciB0b3BMZWZ0QXggPSByZWN0QS5nZXRYKCk7XHJcbiAgdmFyIHRvcExlZnRBeSA9IHJlY3RBLmdldFkoKTtcclxuICB2YXIgdG9wUmlnaHRBeCA9IHJlY3RBLmdldFJpZ2h0KCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRBeCA9IHJlY3RBLmdldFgoKTtcclxuICB2YXIgYm90dG9tTGVmdEF5ID0gcmVjdEEuZ2V0Qm90dG9tKCk7XHJcbiAgdmFyIGJvdHRvbVJpZ2h0QXggPSByZWN0QS5nZXRSaWdodCgpO1xyXG4gIHZhciBoYWxmV2lkdGhBID0gcmVjdEEuZ2V0V2lkdGhIYWxmKCk7XHJcbiAgdmFyIGhhbGZIZWlnaHRBID0gcmVjdEEuZ2V0SGVpZ2h0SGFsZigpO1xyXG4gIC8vdmFyaWFibGVzIGZvciByZWN0QlxyXG4gIHZhciB0b3BMZWZ0QnggPSByZWN0Qi5nZXRYKCk7XHJcbiAgdmFyIHRvcExlZnRCeSA9IHJlY3RCLmdldFkoKTtcclxuICB2YXIgdG9wUmlnaHRCeCA9IHJlY3RCLmdldFJpZ2h0KCk7XHJcbiAgdmFyIGJvdHRvbUxlZnRCeCA9IHJlY3RCLmdldFgoKTtcclxuICB2YXIgYm90dG9tTGVmdEJ5ID0gcmVjdEIuZ2V0Qm90dG9tKCk7XHJcbiAgdmFyIGJvdHRvbVJpZ2h0QnggPSByZWN0Qi5nZXRSaWdodCgpO1xyXG4gIHZhciBoYWxmV2lkdGhCID0gcmVjdEIuZ2V0V2lkdGhIYWxmKCk7XHJcbiAgdmFyIGhhbGZIZWlnaHRCID0gcmVjdEIuZ2V0SGVpZ2h0SGFsZigpO1xyXG4gIC8vZmxhZyB3aGV0aGVyIGNsaXBwaW5nIHBvaW50cyBhcmUgZm91bmRcclxuICB2YXIgY2xpcFBvaW50QUZvdW5kID0gZmFsc2U7XHJcbiAgdmFyIGNsaXBQb2ludEJGb3VuZCA9IGZhbHNlO1xyXG5cclxuICAvLyBsaW5lIGlzIHZlcnRpY2FsXHJcbiAgaWYgKHAxeCA9PSBwMngpXHJcbiAge1xyXG4gICAgaWYgKHAxeSA+IHAyeSlcclxuICAgIHtcclxuICAgICAgcmVzdWx0WzBdID0gcDF4O1xyXG4gICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgIHJlc3VsdFsyXSA9IHAyeDtcclxuICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChwMXkgPCBwMnkpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHAxeDtcclxuICAgICAgcmVzdWx0WzFdID0gYm90dG9tTGVmdEF5O1xyXG4gICAgICByZXN1bHRbMl0gPSBwMng7XHJcbiAgICAgIHJlc3VsdFszXSA9IHRvcExlZnRCeTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICAvL25vdCBsaW5lLCByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcbiAgLy8gbGluZSBpcyBob3Jpem9udGFsXHJcbiAgZWxzZSBpZiAocDF5ID09IHAyeSlcclxuICB7XHJcbiAgICBpZiAocDF4ID4gcDJ4KVxyXG4gICAge1xyXG4gICAgICByZXN1bHRbMF0gPSB0b3BMZWZ0QXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgICAgcmVzdWx0WzJdID0gdG9wUmlnaHRCeDtcclxuICAgICAgcmVzdWx0WzNdID0gcDJ5O1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChwMXggPCBwMngpXHJcbiAgICB7XHJcbiAgICAgIHJlc3VsdFswXSA9IHRvcFJpZ2h0QXg7XHJcbiAgICAgIHJlc3VsdFsxXSA9IHAxeTtcclxuICAgICAgcmVzdWx0WzJdID0gdG9wTGVmdEJ4O1xyXG4gICAgICByZXN1bHRbM10gPSBwMnk7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgLy9ub3QgdmFsaWQgbGluZSwgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICAvL3Nsb3BlcyBvZiByZWN0QSdzIGFuZCByZWN0QidzIGRpYWdvbmFsc1xyXG4gICAgdmFyIHNsb3BlQSA9IHJlY3RBLmhlaWdodCAvIHJlY3RBLndpZHRoO1xyXG4gICAgdmFyIHNsb3BlQiA9IHJlY3RCLmhlaWdodCAvIHJlY3RCLndpZHRoO1xyXG5cclxuICAgIC8vc2xvcGUgb2YgbGluZSBiZXR3ZWVuIGNlbnRlciBvZiByZWN0QSBhbmQgY2VudGVyIG9mIHJlY3RCXHJcbiAgICB2YXIgc2xvcGVQcmltZSA9IChwMnkgLSBwMXkpIC8gKHAyeCAtIHAxeCk7XHJcbiAgICB2YXIgY2FyZGluYWxEaXJlY3Rpb25BO1xyXG4gICAgdmFyIGNhcmRpbmFsRGlyZWN0aW9uQjtcclxuICAgIHZhciB0ZW1wUG9pbnRBeDtcclxuICAgIHZhciB0ZW1wUG9pbnRBeTtcclxuICAgIHZhciB0ZW1wUG9pbnRCeDtcclxuICAgIHZhciB0ZW1wUG9pbnRCeTtcclxuXHJcbiAgICAvL2RldGVybWluZSB3aGV0aGVyIGNsaXBwaW5nIHBvaW50IGlzIHRoZSBjb3JuZXIgb2Ygbm9kZUFcclxuICAgIGlmICgoLXNsb3BlQSkgPT0gc2xvcGVQcmltZSlcclxuICAgIHtcclxuICAgICAgaWYgKHAxeCA+IHAyeClcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFswXSA9IGJvdHRvbUxlZnRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSB0b3BSaWdodEF4O1xyXG4gICAgICAgIHJlc3VsdFsxXSA9IHRvcExlZnRBeTtcclxuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmIChzbG9wZUEgPT0gc2xvcGVQcmltZSlcclxuICAgIHtcclxuICAgICAgaWYgKHAxeCA+IHAyeClcclxuICAgICAge1xyXG4gICAgICAgIHJlc3VsdFswXSA9IHRvcExlZnRBeDtcclxuICAgICAgICByZXN1bHRbMV0gPSB0b3BMZWZ0QXk7XHJcbiAgICAgICAgY2xpcFBvaW50QUZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMF0gPSBib3R0b21SaWdodEF4O1xyXG4gICAgICAgIHJlc3VsdFsxXSA9IGJvdHRvbUxlZnRBeTtcclxuICAgICAgICBjbGlwUG9pbnRBRm91bmQgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgd2hldGhlciBjbGlwcGluZyBwb2ludCBpcyB0aGUgY29ybmVyIG9mIG5vZGVCXHJcbiAgICBpZiAoKC1zbG9wZUIpID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMnggPiBwMXgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMl0gPSBib3R0b21MZWZ0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gYm90dG9tTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gdG9wUmlnaHRCeDtcclxuICAgICAgICByZXN1bHRbM10gPSB0b3BMZWZ0Qnk7XHJcbiAgICAgICAgY2xpcFBvaW50QkZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoc2xvcGVCID09IHNsb3BlUHJpbWUpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMnggPiBwMXgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXN1bHRbMl0gPSB0b3BMZWZ0Qng7XHJcbiAgICAgICAgcmVzdWx0WzNdID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgIGNsaXBQb2ludEJGb3VuZCA9IHRydWU7XHJcbiAgICAgIH1cclxuICAgICAgZWxzZVxyXG4gICAgICB7XHJcbiAgICAgICAgcmVzdWx0WzJdID0gYm90dG9tUmlnaHRCeDtcclxuICAgICAgICByZXN1bHRbM10gPSBib3R0b21MZWZ0Qnk7XHJcbiAgICAgICAgY2xpcFBvaW50QkZvdW5kID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vaWYgYm90aCBjbGlwcGluZyBwb2ludHMgYXJlIGNvcm5lcnNcclxuICAgIGlmIChjbGlwUG9pbnRBRm91bmQgJiYgY2xpcFBvaW50QkZvdW5kKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy9kZXRlcm1pbmUgQ2FyZGluYWwgRGlyZWN0aW9uIG9mIHJlY3RhbmdsZXNcclxuICAgIGlmIChwMXggPiBwMngpXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVBLCBzbG9wZVByaW1lLCA0KTtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkIgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oc2xvcGVCLCBzbG9wZVByaW1lLCAyKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMyk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDEpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIGlmIChwMXkgPiBwMnkpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXJkaW5hbERpcmVjdGlvbkEgPSBJR2VvbWV0cnkuZ2V0Q2FyZGluYWxEaXJlY3Rpb24oLXNsb3BlQSwgc2xvcGVQcmltZSwgMSk7XHJcbiAgICAgICAgY2FyZGluYWxEaXJlY3Rpb25CID0gSUdlb21ldHJ5LmdldENhcmRpbmFsRGlyZWN0aW9uKC1zbG9wZUIsIHNsb3BlUHJpbWUsIDMpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2VcclxuICAgICAge1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQSA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUEsIHNsb3BlUHJpbWUsIDIpO1xyXG4gICAgICAgIGNhcmRpbmFsRGlyZWN0aW9uQiA9IElHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbihzbG9wZUIsIHNsb3BlUHJpbWUsIDQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICAvL2NhbGN1bGF0ZSBjbGlwcGluZyBQb2ludCBpZiBpdCBpcyBub3QgZm91bmQgYmVmb3JlXHJcbiAgICBpZiAoIWNsaXBQb2ludEFGb3VuZClcclxuICAgIHtcclxuICAgICAgc3dpdGNoIChjYXJkaW5hbERpcmVjdGlvbkEpXHJcbiAgICAgIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeSA9IHRvcExlZnRBeTtcclxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gcDF4ICsgKC1oYWxmSGVpZ2h0QSkgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzBdID0gdGVtcFBvaW50QXg7XHJcbiAgICAgICAgICByZXN1bHRbMV0gPSB0ZW1wUG9pbnRBeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgIHRlbXBQb2ludEF4ID0gYm90dG9tUmlnaHRBeDtcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgaGFsZldpZHRoQSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgdGVtcFBvaW50QXkgPSBib3R0b21MZWZ0QXk7XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IHAxeCArIGhhbGZIZWlnaHRBIC8gc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFswXSA9IHRlbXBQb2ludEF4O1xyXG4gICAgICAgICAgcmVzdWx0WzFdID0gdGVtcFBvaW50QXk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRBeCA9IGJvdHRvbUxlZnRBeDtcclxuICAgICAgICAgIHRlbXBQb2ludEF5ID0gcDF5ICsgKC1oYWxmV2lkdGhBKSAqIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMF0gPSB0ZW1wUG9pbnRBeDtcclxuICAgICAgICAgIHJlc3VsdFsxXSA9IHRlbXBQb2ludEF5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmICghY2xpcFBvaW50QkZvdW5kKVxyXG4gICAge1xyXG4gICAgICBzd2l0Y2ggKGNhcmRpbmFsRGlyZWN0aW9uQilcclxuICAgICAge1xyXG4gICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgIHRlbXBQb2ludEJ5ID0gdG9wTGVmdEJ5O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnggPSBwMnggKyAoLWhhbGZIZWlnaHRCKSAvIHNsb3BlUHJpbWU7XHJcbiAgICAgICAgICByZXN1bHRbMl0gPSB0ZW1wUG9pbnRCeDtcclxuICAgICAgICAgIHJlc3VsdFszXSA9IHRlbXBQb2ludEJ5O1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgdGVtcFBvaW50QnggPSBib3R0b21SaWdodEJ4O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyBoYWxmV2lkdGhCICogc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICB0ZW1wUG9pbnRCeSA9IGJvdHRvbUxlZnRCeTtcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gcDJ4ICsgaGFsZkhlaWdodEIgLyBzbG9wZVByaW1lO1xyXG4gICAgICAgICAgcmVzdWx0WzJdID0gdGVtcFBvaW50Qng7XHJcbiAgICAgICAgICByZXN1bHRbM10gPSB0ZW1wUG9pbnRCeTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgIHRlbXBQb2ludEJ4ID0gYm90dG9tTGVmdEJ4O1xyXG4gICAgICAgICAgdGVtcFBvaW50QnkgPSBwMnkgKyAoLWhhbGZXaWR0aEIpICogc2xvcGVQcmltZTtcclxuICAgICAgICAgIHJlc3VsdFsyXSA9IHRlbXBQb2ludEJ4O1xyXG4gICAgICAgICAgcmVzdWx0WzNdID0gdGVtcFBvaW50Qnk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbklHZW9tZXRyeS5nZXRDYXJkaW5hbERpcmVjdGlvbiA9IGZ1bmN0aW9uIChzbG9wZSwgc2xvcGVQcmltZSwgbGluZSlcclxue1xyXG4gIGlmIChzbG9wZSA+IHNsb3BlUHJpbWUpXHJcbiAge1xyXG4gICAgcmV0dXJuIGxpbmU7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gMSArIGxpbmUgJSA0O1xyXG4gIH1cclxufVxyXG5cclxuSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbiA9IGZ1bmN0aW9uIChzMSwgczIsIGYxLCBmMilcclxue1xyXG4gIGlmIChmMiA9PSBudWxsKSB7XHJcbiAgICByZXR1cm4gSUdlb21ldHJ5LmdldEludGVyc2VjdGlvbjIoczEsIHMyLCBmMSk7XHJcbiAgfVxyXG4gIHZhciB4MSA9IHMxLng7XHJcbiAgdmFyIHkxID0gczEueTtcclxuICB2YXIgeDIgPSBzMi54O1xyXG4gIHZhciB5MiA9IHMyLnk7XHJcbiAgdmFyIHgzID0gZjEueDtcclxuICB2YXIgeTMgPSBmMS55O1xyXG4gIHZhciB4NCA9IGYyLng7XHJcbiAgdmFyIHk0ID0gZjIueTtcclxuICB2YXIgeCwgeTsgLy8gaW50ZXJzZWN0aW9uIHBvaW50XHJcbiAgdmFyIGExLCBhMiwgYjEsIGIyLCBjMSwgYzI7IC8vIGNvZWZmaWNpZW50cyBvZiBsaW5lIGVxbnMuXHJcbiAgdmFyIGRlbm9tO1xyXG5cclxuICBhMSA9IHkyIC0geTE7XHJcbiAgYjEgPSB4MSAtIHgyO1xyXG4gIGMxID0geDIgKiB5MSAtIHgxICogeTI7ICAvLyB7IGExKnggKyBiMSp5ICsgYzEgPSAwIGlzIGxpbmUgMSB9XHJcblxyXG4gIGEyID0geTQgLSB5MztcclxuICBiMiA9IHgzIC0geDQ7XHJcbiAgYzIgPSB4NCAqIHkzIC0geDMgKiB5NDsgIC8vIHsgYTIqeCArIGIyKnkgKyBjMiA9IDAgaXMgbGluZSAyIH1cclxuXHJcbiAgZGVub20gPSBhMSAqIGIyIC0gYTIgKiBiMTtcclxuXHJcbiAgaWYgKGRlbm9tID09IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICB4ID0gKGIxICogYzIgLSBiMiAqIGMxKSAvIGRlbm9tO1xyXG4gIHkgPSAoYTIgKiBjMSAtIGExICogYzIpIC8gZGVub207XHJcblxyXG4gIHJldHVybiBuZXcgUG9pbnQoeCwgeSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFNlY3Rpb246IENsYXNzIENvbnN0YW50c1xyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vKipcclxuICogU29tZSB1c2VmdWwgcHJlLWNhbGN1bGF0ZWQgY29uc3RhbnRzXHJcbiAqL1xyXG5JR2VvbWV0cnkuSEFMRl9QSSA9IDAuNSAqIE1hdGguUEk7XHJcbklHZW9tZXRyeS5PTkVfQU5EX0hBTEZfUEkgPSAxLjUgKiBNYXRoLlBJO1xyXG5JR2VvbWV0cnkuVFdPX1BJID0gMi4wICogTWF0aC5QSTtcclxuSUdlb21ldHJ5LlRIUkVFX1BJID0gMy4wICogTWF0aC5QSTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSUdlb21ldHJ5O1xyXG4iLCJmdW5jdGlvbiBJTWF0aCgpIHtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIHJldHVybnMgdGhlIHNpZ24gb2YgdGhlIGlucHV0IHZhbHVlLlxyXG4gKi9cclxuSU1hdGguc2lnbiA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIGlmICh2YWx1ZSA+IDApXHJcbiAge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHZhbHVlIDwgMClcclxuICB7XHJcbiAgICByZXR1cm4gLTE7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gMDtcclxuICB9XHJcbn1cclxuXHJcbklNYXRoLmZsb29yID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgcmV0dXJuIHZhbHVlIDwgMCA/IE1hdGguY2VpbCh2YWx1ZSkgOiBNYXRoLmZsb29yKHZhbHVlKTtcclxufVxyXG5cclxuSU1hdGguY2VpbCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gIHJldHVybiB2YWx1ZSA8IDAgPyBNYXRoLmZsb29yKHZhbHVlKSA6IE1hdGguY2VpbCh2YWx1ZSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSU1hdGg7XHJcbiIsImZ1bmN0aW9uIEludGVnZXIoKSB7XHJcbn1cclxuXHJcbkludGVnZXIuTUFYX1ZBTFVFID0gMjE0NzQ4MzY0NztcclxuSW50ZWdlci5NSU5fVkFMVUUgPSAtMjE0NzQ4MzY0ODtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gSW50ZWdlcjtcclxuIiwidmFyIExHcmFwaE9iamVjdCA9IHJlcXVpcmUoJy4vTEdyYXBoT2JqZWN0Jyk7XHJcbnZhciBJR2VvbWV0cnkgPSByZXF1aXJlKCcuL0lHZW9tZXRyeScpO1xyXG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XHJcblxyXG5mdW5jdGlvbiBMRWRnZShzb3VyY2UsIHRhcmdldCwgdkVkZ2UpIHtcclxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2RWRnZSk7XHJcblxyXG4gIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID0gZmFsc2U7XHJcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2RWRnZTtcclxuICB0aGlzLmJlbmRwb2ludHMgPSBbXTtcclxuICB0aGlzLnNvdXJjZSA9IHNvdXJjZTtcclxuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcclxufVxyXG5cclxuTEVkZ2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShMR3JhcGhPYmplY3QucHJvdG90eXBlKTtcclxuXHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XHJcbiAgTEVkZ2VbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRTb3VyY2UgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuc291cmNlO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldFRhcmdldCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy50YXJnZXQ7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuaXNJbnRlckdyYXBoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmlzSW50ZXJHcmFwaDtcclxufTtcclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRMZW5ndGggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGVuZ3RoO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5pc092ZXJsYXBpbmdTb3VyY2VBbmRUYXJnZXQ7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0QmVuZHBvaW50cyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5iZW5kcG9pbnRzO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLmdldExjYSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0U291cmNlSW5MY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuc291cmNlSW5MY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0VGFyZ2V0SW5MY2EgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMudGFyZ2V0SW5MY2E7XHJcbn07XHJcblxyXG5MRWRnZS5wcm90b3R5cGUuZ2V0T3RoZXJFbmQgPSBmdW5jdGlvbiAobm9kZSlcclxue1xyXG4gIGlmICh0aGlzLnNvdXJjZSA9PT0gbm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy50YXJnZXQ7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHRoaXMudGFyZ2V0ID09PSBub2RlKVxyXG4gIHtcclxuICAgIHJldHVybiB0aGlzLnNvdXJjZTtcclxuICB9XHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIHRocm93IFwiTm9kZSBpcyBub3QgaW5jaWRlbnQgd2l0aCB0aGlzIGVkZ2VcIjtcclxuICB9XHJcbn1cclxuXHJcbkxFZGdlLnByb3RvdHlwZS5nZXRPdGhlckVuZEluR3JhcGggPSBmdW5jdGlvbiAobm9kZSwgZ3JhcGgpXHJcbntcclxuICB2YXIgb3RoZXJFbmQgPSB0aGlzLmdldE90aGVyRW5kKG5vZGUpO1xyXG4gIHZhciByb290ID0gZ3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpO1xyXG5cclxuICB3aGlsZSAodHJ1ZSlcclxuICB7XHJcbiAgICBpZiAob3RoZXJFbmQuZ2V0T3duZXIoKSA9PSBncmFwaClcclxuICAgIHtcclxuICAgICAgcmV0dXJuIG90aGVyRW5kO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvdGhlckVuZC5nZXRPd25lcigpID09IHJvb3QpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIG90aGVyRW5kID0gb3RoZXJFbmQuZ2V0T3duZXIoKS5nZXRQYXJlbnQoKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBudWxsO1xyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgY2xpcFBvaW50Q29vcmRpbmF0ZXMgPSBuZXcgQXJyYXkoNCk7XHJcblxyXG4gIHRoaXMuaXNPdmVybGFwaW5nU291cmNlQW5kVGFyZ2V0ID1cclxuICAgICAgICAgIElHZW9tZXRyeS5nZXRJbnRlcnNlY3Rpb24odGhpcy50YXJnZXQuZ2V0UmVjdCgpLFxyXG4gICAgICAgICAgICAgICAgICB0aGlzLnNvdXJjZS5nZXRSZWN0KCksXHJcbiAgICAgICAgICAgICAgICAgIGNsaXBQb2ludENvb3JkaW5hdGVzKTtcclxuXHJcbiAgaWYgKCF0aGlzLmlzT3ZlcmxhcGluZ1NvdXJjZUFuZFRhcmdldClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFggPSBjbGlwUG9pbnRDb29yZGluYXRlc1swXSAtIGNsaXBQb2ludENvb3JkaW5hdGVzWzJdO1xyXG4gICAgdGhpcy5sZW5ndGhZID0gY2xpcFBvaW50Q29vcmRpbmF0ZXNbMV0gLSBjbGlwUG9pbnRDb29yZGluYXRlc1szXTtcclxuXHJcbiAgICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhYKSA8IDEuMClcclxuICAgIHtcclxuICAgICAgdGhpcy5sZW5ndGhYID0gSU1hdGguc2lnbih0aGlzLmxlbmd0aFgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChNYXRoLmFicyh0aGlzLmxlbmd0aFkpIDwgMS4wKVxyXG4gICAge1xyXG4gICAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5sZW5ndGggPSBNYXRoLnNxcnQoXHJcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEVkZ2UucHJvdG90eXBlLnVwZGF0ZUxlbmd0aFNpbXBsZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmxlbmd0aFggPSB0aGlzLnRhcmdldC5nZXRDZW50ZXJYKCkgLSB0aGlzLnNvdXJjZS5nZXRDZW50ZXJYKCk7XHJcbiAgdGhpcy5sZW5ndGhZID0gdGhpcy50YXJnZXQuZ2V0Q2VudGVyWSgpIC0gdGhpcy5zb3VyY2UuZ2V0Q2VudGVyWSgpO1xyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhYKSA8IDEuMClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFggPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWCk7XHJcbiAgfVxyXG5cclxuICBpZiAoTWF0aC5hYnModGhpcy5sZW5ndGhZKSA8IDEuMClcclxuICB7XHJcbiAgICB0aGlzLmxlbmd0aFkgPSBJTWF0aC5zaWduKHRoaXMubGVuZ3RoWSk7XHJcbiAgfVxyXG5cclxuICB0aGlzLmxlbmd0aCA9IE1hdGguc3FydChcclxuICAgICAgICAgIHRoaXMubGVuZ3RoWCAqIHRoaXMubGVuZ3RoWCArIHRoaXMubGVuZ3RoWSAqIHRoaXMubGVuZ3RoWSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEVkZ2U7XHJcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIExHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0xHcmFwaE1hbmFnZXInKTtcclxudmFyIExOb2RlID0gcmVxdWlyZSgnLi9MTm9kZScpO1xyXG52YXIgSGFzaFNldCA9IHJlcXVpcmUoJy4vSGFzaFNldCcpO1xyXG52YXIgUmVjdGFuZ2xlRCA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlRCcpO1xyXG52YXIgUG9pbnQgPSByZXF1aXJlKCcuL1BvaW50Jyk7XHJcblxyXG5mdW5jdGlvbiBMR3JhcGgocGFyZW50LCBvYmoyLCB2R3JhcGgpIHtcclxuICBMR3JhcGhPYmplY3QuY2FsbCh0aGlzLCB2R3JhcGgpO1xyXG4gIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IEludGVnZXIuTUlOX1ZBTFVFO1xyXG4gIHRoaXMubWFyZ2luID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBUEhfTUFSR0lOO1xyXG4gIHRoaXMuZWRnZXMgPSBbXTtcclxuICB0aGlzLm5vZGVzID0gW107XHJcbiAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xyXG4gIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG5cclxuICBpZiAob2JqMiAhPSBudWxsICYmIG9iajIgaW5zdGFuY2VvZiBMR3JhcGhNYW5hZ2VyKSB7XHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlciA9IG9iajI7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKG9iajIgIT0gbnVsbCAmJiBvYmoyIGluc3RhbmNlb2YgTGF5b3V0KSB7XHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlciA9IG9iajIuZ3JhcGhNYW5hZ2VyO1xyXG4gIH1cclxufVxyXG5cclxuTEdyYXBoLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoT2JqZWN0LnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XHJcbiAgTEdyYXBoW3Byb3BdID0gTEdyYXBoT2JqZWN0W3Byb3BdO1xyXG59XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldE5vZGVzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLm5vZGVzO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRFZGdlcyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5lZGdlcztcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0R3JhcGhNYW5hZ2VyID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlcjtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0UGFyZW50ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnBhcmVudDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0TGVmdCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sZWZ0O1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRSaWdodCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yaWdodDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0VG9wID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnRvcDtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuZ2V0Qm90dG9tID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmJvdHRvbTtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUuaXNDb25uZWN0ZWQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuaXNDb25uZWN0ZWQ7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChvYmoxLCBzb3VyY2VOb2RlLCB0YXJnZXROb2RlKSB7XHJcbiAgaWYgKHNvdXJjZU5vZGUgPT0gbnVsbCAmJiB0YXJnZXROb2RlID09IG51bGwpIHtcclxuICAgIHZhciBuZXdOb2RlID0gb2JqMTtcclxuICAgIGlmICh0aGlzLmdyYXBoTWFuYWdlciA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiR3JhcGggaGFzIG5vIGdyYXBoIG1nciFcIjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdldE5vZGVzKCkuaW5kZXhPZihuZXdOb2RlKSA+IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm9kZSBhbHJlYWR5IGluIGdyYXBoIVwiO1xyXG4gICAgfVxyXG4gICAgbmV3Tm9kZS5vd25lciA9IHRoaXM7XHJcbiAgICB0aGlzLmdldE5vZGVzKCkucHVzaChuZXdOb2RlKTtcclxuXHJcbiAgICByZXR1cm4gbmV3Tm9kZTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgbmV3RWRnZSA9IG9iajE7XHJcbiAgICBpZiAoISh0aGlzLmdldE5vZGVzKCkuaW5kZXhPZihzb3VyY2VOb2RlKSA+IC0xICYmICh0aGlzLmdldE5vZGVzKCkuaW5kZXhPZih0YXJnZXROb2RlKSkgPiAtMSkpIHtcclxuICAgICAgdGhyb3cgXCJTb3VyY2Ugb3IgdGFyZ2V0IG5vdCBpbiBncmFwaCFcIjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIShzb3VyY2VOb2RlLm93bmVyID09IHRhcmdldE5vZGUub3duZXIgJiYgc291cmNlTm9kZS5vd25lciA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIkJvdGggb3duZXJzIG11c3QgYmUgdGhpcyBncmFwaCFcIjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc291cmNlTm9kZS5vd25lciAhPSB0YXJnZXROb2RlLm93bmVyKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBzZXQgc291cmNlIGFuZCB0YXJnZXRcclxuICAgIG5ld0VkZ2Uuc291cmNlID0gc291cmNlTm9kZTtcclxuICAgIG5ld0VkZ2UudGFyZ2V0ID0gdGFyZ2V0Tm9kZTtcclxuXHJcbiAgICAvLyBzZXQgYXMgaW50cmEtZ3JhcGggZWRnZVxyXG4gICAgbmV3RWRnZS5pc0ludGVyR3JhcGggPSBmYWxzZTtcclxuXHJcbiAgICAvLyBhZGQgdG8gZ3JhcGggZWRnZSBsaXN0XHJcbiAgICB0aGlzLmdldEVkZ2VzKCkucHVzaChuZXdFZGdlKTtcclxuXHJcbiAgICAvLyBhZGQgdG8gaW5jaWRlbmN5IGxpc3RzXHJcbiAgICBzb3VyY2VOb2RlLmVkZ2VzLnB1c2gobmV3RWRnZSk7XHJcblxyXG4gICAgaWYgKHRhcmdldE5vZGUgIT0gc291cmNlTm9kZSlcclxuICAgIHtcclxuICAgICAgdGFyZ2V0Tm9kZS5lZGdlcy5wdXNoKG5ld0VkZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXdFZGdlO1xyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIHZhciBub2RlID0gb2JqO1xyXG4gIGlmIChvYmogaW5zdGFuY2VvZiBMTm9kZSkge1xyXG4gICAgaWYgKG5vZGUgPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIk5vZGUgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICghKG5vZGUub3duZXIgIT0gbnVsbCAmJiBub2RlLm93bmVyID09IHRoaXMpKSB7XHJcbiAgICAgIHRocm93IFwiT3duZXIgZ3JhcGggaXMgaW52YWxpZCFcIjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdyYXBoTWFuYWdlciA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiT3duZXIgZ3JhcGggbWFuYWdlciBpcyBpbnZhbGlkIVwiO1xyXG4gICAgfVxyXG4gICAgLy8gcmVtb3ZlIGluY2lkZW50IGVkZ2VzIGZpcnN0IChtYWtlIGEgY29weSB0byBkbyBpdCBzYWZlbHkpXHJcbiAgICB2YXIgZWRnZXNUb0JlUmVtb3ZlZCA9IG5vZGUuZWRnZXMuc2xpY2UoKTtcclxuICAgIHZhciBlZGdlO1xyXG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcclxuXHJcbiAgICAgIGlmIChlZGdlLmlzSW50ZXJHcmFwaClcclxuICAgICAge1xyXG4gICAgICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLnJlbW92ZShlZGdlKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICBlZGdlLnNvdXJjZS5vd25lci5yZW1vdmUoZWRnZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBub3cgdGhlIG5vZGUgaXRzZWxmXHJcbiAgICB2YXIgaW5kZXggPSB0aGlzLm5vZGVzLmluZGV4T2Yobm9kZSk7XHJcbiAgICBpZiAoaW5kZXggPT0gLTEpIHtcclxuICAgICAgdGhyb3cgXCJOb2RlIG5vdCBpbiBvd25lciBub2RlIGxpc3QhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5ub2Rlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gIH1cclxuICBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBMRWRnZSkge1xyXG4gICAgdmFyIGVkZ2UgPSBvYmo7XHJcbiAgICBpZiAoZWRnZSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiRWRnZSBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UgIT0gbnVsbCAmJiBlZGdlLnRhcmdldCAhPSBudWxsKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoIShlZGdlLnNvdXJjZS5vd25lciAhPSBudWxsICYmIGVkZ2UudGFyZ2V0Lm93bmVyICE9IG51bGwgJiZcclxuICAgICAgICAgICAgZWRnZS5zb3VyY2Uub3duZXIgPT0gdGhpcyAmJiBlZGdlLnRhcmdldC5vd25lciA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IG93bmVyIGlzIGludmFsaWQhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHNvdXJjZUluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIHZhciB0YXJnZXRJbmRleCA9IGVkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICBpZiAoIShzb3VyY2VJbmRleCA+IC0xICYmIHRhcmdldEluZGV4ID4gLTEpKSB7XHJcbiAgICAgIHRocm93IFwiU291cmNlIGFuZC9vciB0YXJnZXQgZG9lc24ndCBrbm93IHRoaXMgZWRnZSFcIjtcclxuICAgIH1cclxuXHJcbiAgICBlZGdlLnNvdXJjZS5lZGdlcy5zcGxpY2Uoc291cmNlSW5kZXgsIDEpO1xyXG5cclxuICAgIGlmIChlZGdlLnRhcmdldCAhPSBlZGdlLnNvdXJjZSlcclxuICAgIHtcclxuICAgICAgZWRnZS50YXJnZXQuZWRnZXMuc3BsaWNlKHRhcmdldEluZGV4LCAxKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgaW5kZXggPSBlZGdlLnNvdXJjZS5vd25lci5nZXRFZGdlcygpLmluZGV4T2YoZWRnZSk7XHJcbiAgICBpZiAoaW5kZXggPT0gLTEpIHtcclxuICAgICAgdGhyb3cgXCJOb3QgaW4gb3duZXIncyBlZGdlIGxpc3QhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgZWRnZS5zb3VyY2Uub3duZXIuZ2V0RWRnZXMoKS5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUudXBkYXRlTGVmdFRvcCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIGxlZnQgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgbm9kZVRvcDtcclxuICB2YXIgbm9kZUxlZnQ7XHJcblxyXG4gIHZhciBub2RlcyA9IHRoaXMuZ2V0Tm9kZXMoKTtcclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XHJcbiAgICBub2RlVG9wID0gTWF0aC5mbG9vcihsTm9kZS5nZXRUb3AoKSk7XHJcbiAgICBub2RlTGVmdCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0TGVmdCgpKTtcclxuXHJcbiAgICBpZiAodG9wID4gbm9kZVRvcClcclxuICAgIHtcclxuICAgICAgdG9wID0gbm9kZVRvcDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobGVmdCA+IG5vZGVMZWZ0KVxyXG4gICAge1xyXG4gICAgICBsZWZ0ID0gbm9kZUxlZnQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBEbyB3ZSBoYXZlIGFueSBub2RlcyBpbiB0aGlzIGdyYXBoP1xyXG4gIGlmICh0b3AgPT0gSW50ZWdlci5NQVhfVkFMVUUpXHJcbiAge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG5cclxuICB0aGlzLmxlZnQgPSBsZWZ0IC0gdGhpcy5tYXJnaW47XHJcbiAgdGhpcy50b3AgPSB0b3AgLSB0aGlzLm1hcmdpbjtcclxuXHJcbiAgLy8gQXBwbHkgdGhlIG1hcmdpbnMgYW5kIHJldHVybiB0aGUgcmVzdWx0XHJcbiAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLmxlZnQsIHRoaXMudG9wKTtcclxufTtcclxuXHJcbkxHcmFwaC5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24gKHJlY3Vyc2l2ZSlcclxue1xyXG4gIC8vIGNhbGN1bGF0ZSBib3VuZHNcclxuICB2YXIgbGVmdCA9IEludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciByaWdodCA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgdG9wID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIGJvdHRvbSA9IC1JbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgbm9kZUxlZnQ7XHJcbiAgdmFyIG5vZGVSaWdodDtcclxuICB2YXIgbm9kZVRvcDtcclxuICB2YXIgbm9kZUJvdHRvbTtcclxuXHJcbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICB2YXIgbE5vZGUgPSBub2Rlc1tpXTtcclxuXHJcbiAgICBpZiAocmVjdXJzaXZlICYmIGxOb2RlLmNoaWxkICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGxOb2RlLnVwZGF0ZUJvdW5kcygpO1xyXG4gICAgfVxyXG4gICAgbm9kZUxlZnQgPSBNYXRoLmZsb29yKGxOb2RlLmdldExlZnQoKSk7XHJcbiAgICBub2RlUmlnaHQgPSBNYXRoLmZsb29yKGxOb2RlLmdldFJpZ2h0KCkpO1xyXG4gICAgbm9kZVRvcCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0VG9wKCkpO1xyXG4gICAgbm9kZUJvdHRvbSA9IE1hdGguZmxvb3IobE5vZGUuZ2V0Qm90dG9tKCkpO1xyXG5cclxuICAgIGlmIChsZWZ0ID4gbm9kZUxlZnQpXHJcbiAgICB7XHJcbiAgICAgIGxlZnQgPSBub2RlTGVmdDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAocmlnaHQgPCBub2RlUmlnaHQpXHJcbiAgICB7XHJcbiAgICAgIHJpZ2h0ID0gbm9kZVJpZ2h0O1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0b3AgPiBub2RlVG9wKVxyXG4gICAge1xyXG4gICAgICB0b3AgPSBub2RlVG9wO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChib3R0b20gPCBub2RlQm90dG9tKVxyXG4gICAge1xyXG4gICAgICBib3R0b20gPSBub2RlQm90dG9tO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFyIGJvdW5kaW5nUmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxlZnQsIHRvcCwgcmlnaHQgLSBsZWZ0LCBib3R0b20gLSB0b3ApO1xyXG4gIGlmIChsZWZ0ID09IEludGVnZXIuTUFYX1ZBTFVFKVxyXG4gIHtcclxuICAgIHRoaXMubGVmdCA9IE1hdGguZmxvb3IodGhpcy5wYXJlbnQuZ2V0TGVmdCgpKTtcclxuICAgIHRoaXMucmlnaHQgPSBNYXRoLmZsb29yKHRoaXMucGFyZW50LmdldFJpZ2h0KCkpO1xyXG4gICAgdGhpcy50b3AgPSBNYXRoLmZsb29yKHRoaXMucGFyZW50LmdldFRvcCgpKTtcclxuICAgIHRoaXMuYm90dG9tID0gTWF0aC5mbG9vcih0aGlzLnBhcmVudC5nZXRCb3R0b20oKSk7XHJcbiAgfVxyXG5cclxuICB0aGlzLmxlZnQgPSBib3VuZGluZ1JlY3QueCAtIHRoaXMubWFyZ2luO1xyXG4gIHRoaXMucmlnaHQgPSBib3VuZGluZ1JlY3QueCArIGJvdW5kaW5nUmVjdC53aWR0aCArIHRoaXMubWFyZ2luO1xyXG4gIHRoaXMudG9wID0gYm91bmRpbmdSZWN0LnkgLSB0aGlzLm1hcmdpbjtcclxuICB0aGlzLmJvdHRvbSA9IGJvdW5kaW5nUmVjdC55ICsgYm91bmRpbmdSZWN0LmhlaWdodCArIHRoaXMubWFyZ2luO1xyXG59O1xyXG5cclxuTEdyYXBoLmNhbGN1bGF0ZUJvdW5kcyA9IGZ1bmN0aW9uIChub2Rlcylcclxue1xyXG4gIHZhciBsZWZ0ID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdmFyIHJpZ2h0ID0gLUludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciB0b3AgPSBJbnRlZ2VyLk1BWF9WQUxVRTtcclxuICB2YXIgYm90dG9tID0gLUludGVnZXIuTUFYX1ZBTFVFO1xyXG4gIHZhciBub2RlTGVmdDtcclxuICB2YXIgbm9kZVJpZ2h0O1xyXG4gIHZhciBub2RlVG9wO1xyXG4gIHZhciBub2RlQm90dG9tO1xyXG5cclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XHJcbiAgICBub2RlTGVmdCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0TGVmdCgpKTtcclxuICAgIG5vZGVSaWdodCA9IE1hdGguZmxvb3IobE5vZGUuZ2V0UmlnaHQoKSk7XHJcbiAgICBub2RlVG9wID0gTWF0aC5mbG9vcihsTm9kZS5nZXRUb3AoKSk7XHJcbiAgICBub2RlQm90dG9tID0gTWF0aC5mbG9vcihsTm9kZS5nZXRCb3R0b20oKSk7XHJcblxyXG4gICAgaWYgKGxlZnQgPiBub2RlTGVmdClcclxuICAgIHtcclxuICAgICAgbGVmdCA9IG5vZGVMZWZ0O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChyaWdodCA8IG5vZGVSaWdodClcclxuICAgIHtcclxuICAgICAgcmlnaHQgPSBub2RlUmlnaHQ7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRvcCA+IG5vZGVUb3ApXHJcbiAgICB7XHJcbiAgICAgIHRvcCA9IG5vZGVUb3A7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGJvdHRvbSA8IG5vZGVCb3R0b20pXHJcbiAgICB7XHJcbiAgICAgIGJvdHRvbSA9IG5vZGVCb3R0b207XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgYm91bmRpbmdSZWN0ID0gbmV3IFJlY3RhbmdsZUQobGVmdCwgdG9wLCByaWdodCAtIGxlZnQsIGJvdHRvbSAtIHRvcCk7XHJcblxyXG4gIHJldHVybiBib3VuZGluZ1JlY3Q7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLmdldEluY2x1c2lvblRyZWVEZXB0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcyA9PSB0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkpXHJcbiAge1xyXG4gICAgcmV0dXJuIDE7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQuZ2V0SW5jbHVzaW9uVHJlZURlcHRoKCk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5nZXRFc3RpbWF0ZWRTaXplID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLmVzdGltYXRlZFNpemUgPT0gSW50ZWdlci5NSU5fVkFMVUUpIHtcclxuICAgIHRocm93IFwiYXNzZXJ0IGZhaWxlZFwiO1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xyXG59O1xyXG5cclxuTEdyYXBoLnByb3RvdHlwZS5jYWxjRXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgc2l6ZSA9IDA7XHJcbiAgdmFyIG5vZGVzID0gdGhpcy5ub2RlcztcclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgdmFyIGxOb2RlID0gbm9kZXNbaV07XHJcbiAgICBzaXplICs9IGxOb2RlLmNhbGNFc3RpbWF0ZWRTaXplKCk7XHJcbiAgfVxyXG5cclxuICBpZiAoc2l6ZSA9PSAwKVxyXG4gIHtcclxuICAgIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IExheW91dENvbnN0YW50cy5FTVBUWV9DT01QT1VORF9OT0RFX1NJWkU7XHJcbiAgfVxyXG4gIGVsc2VcclxuICB7XHJcbiAgICB0aGlzLmVzdGltYXRlZFNpemUgPSBNYXRoLmZsb29yKHNpemUgLyBNYXRoLnNxcnQodGhpcy5ub2Rlcy5sZW5ndGgpKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBNYXRoLmZsb29yKHRoaXMuZXN0aW1hdGVkU2l6ZSk7XHJcbn07XHJcblxyXG5MR3JhcGgucHJvdG90eXBlLnVwZGF0ZUNvbm5lY3RlZCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgaWYgKHRoaXMubm9kZXMubGVuZ3RoID09IDApXHJcbiAge1xyXG4gICAgdGhpcy5pc0Nvbm5lY3RlZCA9IHRydWU7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgdG9CZVZpc2l0ZWQgPSBbXTtcclxuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIGN1cnJlbnROb2RlID0gdGhpcy5ub2Rlc1swXTtcclxuICB2YXIgbmVpZ2hib3JFZGdlcztcclxuICB2YXIgY3VycmVudE5laWdoYm9yO1xyXG4gIHRvQmVWaXNpdGVkID0gdG9CZVZpc2l0ZWQuY29uY2F0KGN1cnJlbnROb2RlLndpdGhDaGlsZHJlbigpKTtcclxuXHJcbiAgd2hpbGUgKHRvQmVWaXNpdGVkLmxlbmd0aCA+IDApXHJcbiAge1xyXG4gICAgY3VycmVudE5vZGUgPSB0b0JlVmlzaXRlZC5zaGlmdCgpO1xyXG4gICAgdmlzaXRlZC5hZGQoY3VycmVudE5vZGUpO1xyXG5cclxuICAgIC8vIFRyYXZlcnNlIGFsbCBuZWlnaGJvcnMgb2YgdGhpcyBub2RlXHJcbiAgICBuZWlnaGJvckVkZ2VzID0gY3VycmVudE5vZGUuZ2V0RWRnZXMoKTtcclxuICAgIHZhciBzID0gbmVpZ2hib3JFZGdlcy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgdmFyIG5laWdoYm9yRWRnZSA9IG5laWdoYm9yRWRnZXNbaV07XHJcbiAgICAgIGN1cnJlbnROZWlnaGJvciA9XHJcbiAgICAgICAgICAgICAgbmVpZ2hib3JFZGdlLmdldE90aGVyRW5kSW5HcmFwaChjdXJyZW50Tm9kZSwgdGhpcyk7XHJcblxyXG4gICAgICAvLyBBZGQgdW52aXNpdGVkIG5laWdoYm9ycyB0byB0aGUgbGlzdCB0byB2aXNpdFxyXG4gICAgICBpZiAoY3VycmVudE5laWdoYm9yICE9IG51bGwgJiZcclxuICAgICAgICAgICAgICAhdmlzaXRlZC5jb250YWlucyhjdXJyZW50TmVpZ2hib3IpKVxyXG4gICAgICB7XHJcbiAgICAgICAgdG9CZVZpc2l0ZWQgPSB0b0JlVmlzaXRlZC5jb25jYXQoY3VycmVudE5laWdoYm9yLndpdGhDaGlsZHJlbigpKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGhpcy5pc0Nvbm5lY3RlZCA9IGZhbHNlO1xyXG5cclxuICBpZiAodmlzaXRlZC5zaXplKCkgPj0gdGhpcy5ub2Rlcy5sZW5ndGgpXHJcbiAge1xyXG4gICAgdmFyIG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGggPSAwO1xyXG4gICAgXHJcbiAgICB2YXIgcyA9IHZpc2l0ZWQuc2l6ZSgpO1xyXG4gICAgIE9iamVjdC5rZXlzKHZpc2l0ZWQuc2V0KS5mb3JFYWNoKGZ1bmN0aW9uKHZpc2l0ZWRJZCkge1xyXG4gICAgICB2YXIgdmlzaXRlZE5vZGUgPSB2aXNpdGVkLnNldFt2aXNpdGVkSWRdO1xyXG4gICAgICBpZiAodmlzaXRlZE5vZGUub3duZXIgPT0gc2VsZilcclxuICAgICAge1xyXG4gICAgICAgIG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGgrKztcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKG5vT2ZWaXNpdGVkSW5UaGlzR3JhcGggPT0gdGhpcy5ub2Rlcy5sZW5ndGgpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuaXNDb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTEdyYXBoO1xyXG4iLCJ2YXIgTEdyYXBoO1xyXG52YXIgTEVkZ2UgPSByZXF1aXJlKCcuL0xFZGdlJyk7XHJcblxyXG5mdW5jdGlvbiBMR3JhcGhNYW5hZ2VyKGxheW91dCkge1xyXG4gIExHcmFwaCA9IHJlcXVpcmUoJy4vTEdyYXBoJyk7XHJcbiAgdGhpcy5sYXlvdXQgPSBsYXlvdXQ7XHJcblxyXG4gIHRoaXMuZ3JhcGhzID0gW107XHJcbiAgdGhpcy5lZGdlcyA9IFtdO1xyXG59XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGRSb290ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBuZ3JhcGggPSB0aGlzLmxheW91dC5uZXdHcmFwaCgpO1xyXG4gIHZhciBubm9kZSA9IHRoaXMubGF5b3V0Lm5ld05vZGUobnVsbCk7XHJcbiAgdmFyIHJvb3QgPSB0aGlzLmFkZChuZ3JhcGgsIG5ub2RlKTtcclxuICB0aGlzLnNldFJvb3RHcmFwaChyb290KTtcclxuICByZXR1cm4gdGhpcy5yb290R3JhcGg7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAobmV3R3JhcGgsIHBhcmVudE5vZGUsIG5ld0VkZ2UsIHNvdXJjZU5vZGUsIHRhcmdldE5vZGUpXHJcbntcclxuICAvL3RoZXJlIGFyZSBqdXN0IDIgcGFyYW1ldGVycyBhcmUgcGFzc2VkIHRoZW4gaXQgYWRkcyBhbiBMR3JhcGggZWxzZSBpdCBhZGRzIGFuIExFZGdlXHJcbiAgaWYgKG5ld0VkZ2UgPT0gbnVsbCAmJiBzb3VyY2VOb2RlID09IG51bGwgJiYgdGFyZ2V0Tm9kZSA9PSBudWxsKSB7XHJcbiAgICBpZiAobmV3R3JhcGggPT0gbnVsbCkge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIGlzIG51bGwhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiUGFyZW50IG5vZGUgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLmdyYXBocy5pbmRleE9mKG5ld0dyYXBoKSA+IC0xKSB7XHJcbiAgICAgIHRocm93IFwiR3JhcGggYWxyZWFkeSBpbiB0aGlzIGdyYXBoIG1nciFcIjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmdyYXBocy5wdXNoKG5ld0dyYXBoKTtcclxuXHJcbiAgICBpZiAobmV3R3JhcGgucGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJBbHJlYWR5IGhhcyBhIHBhcmVudCFcIjtcclxuICAgIH1cclxuICAgIGlmIChwYXJlbnROb2RlLmNoaWxkICE9IG51bGwpIHtcclxuICAgICAgdGhyb3cgIFwiQWxyZWFkeSBoYXMgYSBjaGlsZCFcIjtcclxuICAgIH1cclxuXHJcbiAgICBuZXdHcmFwaC5wYXJlbnQgPSBwYXJlbnROb2RlO1xyXG4gICAgcGFyZW50Tm9kZS5jaGlsZCA9IG5ld0dyYXBoO1xyXG5cclxuICAgIHJldHVybiBuZXdHcmFwaDtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICAvL2NoYW5nZSB0aGUgb3JkZXIgb2YgdGhlIHBhcmFtZXRlcnNcclxuICAgIHRhcmdldE5vZGUgPSBuZXdFZGdlO1xyXG4gICAgc291cmNlTm9kZSA9IHBhcmVudE5vZGU7XHJcbiAgICBuZXdFZGdlID0gbmV3R3JhcGg7XHJcbiAgICB2YXIgc291cmNlR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XHJcbiAgICB2YXIgdGFyZ2V0R3JhcGggPSB0YXJnZXROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgaWYgKCEoc291cmNlR3JhcGggIT0gbnVsbCAmJiBzb3VyY2VHcmFwaC5nZXRHcmFwaE1hbmFnZXIoKSA9PSB0aGlzKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XHJcbiAgICB9XHJcbiAgICBpZiAoISh0YXJnZXRHcmFwaCAhPSBudWxsICYmIHRhcmdldEdyYXBoLmdldEdyYXBoTWFuYWdlcigpID09IHRoaXMpKSB7XHJcbiAgICAgIHRocm93IFwiVGFyZ2V0IG5vdCBpbiB0aGlzIGdyYXBoIG1nciFcIjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoc291cmNlR3JhcGggPT0gdGFyZ2V0R3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gZmFsc2U7XHJcbiAgICAgIHJldHVybiBzb3VyY2VHcmFwaC5hZGQobmV3RWRnZSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XHJcbiAgICB9XHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIG5ld0VkZ2UuaXNJbnRlckdyYXBoID0gdHJ1ZTtcclxuXHJcbiAgICAgIC8vIHNldCBzb3VyY2UgYW5kIHRhcmdldFxyXG4gICAgICBuZXdFZGdlLnNvdXJjZSA9IHNvdXJjZU5vZGU7XHJcbiAgICAgIG5ld0VkZ2UudGFyZ2V0ID0gdGFyZ2V0Tm9kZTtcclxuXHJcbiAgICAgIC8vIGFkZCBlZGdlIHRvIGludGVyLWdyYXBoIGVkZ2UgbGlzdFxyXG4gICAgICBpZiAodGhpcy5lZGdlcy5pbmRleE9mKG5ld0VkZ2UpID4gLTEpIHtcclxuICAgICAgICB0aHJvdyBcIkVkZ2UgYWxyZWFkeSBpbiBpbnRlci1ncmFwaCBlZGdlIGxpc3QhXCI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuXHJcbiAgICAgIC8vIGFkZCBlZGdlIHRvIHNvdXJjZSBhbmQgdGFyZ2V0IGluY2lkZW5jeSBsaXN0c1xyXG4gICAgICBpZiAoIShuZXdFZGdlLnNvdXJjZSAhPSBudWxsICYmIG5ld0VkZ2UudGFyZ2V0ICE9IG51bGwpKSB7XHJcbiAgICAgICAgdGhyb3cgXCJFZGdlIHNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICghKG5ld0VkZ2Uuc291cmNlLmVkZ2VzLmluZGV4T2YobmV3RWRnZSkgPT0gLTEgJiYgbmV3RWRnZS50YXJnZXQuZWRnZXMuaW5kZXhPZihuZXdFZGdlKSA9PSAtMSkpIHtcclxuICAgICAgICB0aHJvdyBcIkVkZ2UgYWxyZWFkeSBpbiBzb3VyY2UgYW5kL29yIHRhcmdldCBpbmNpZGVuY3kgbGlzdCFcIjtcclxuICAgICAgfVxyXG5cclxuICAgICAgbmV3RWRnZS5zb3VyY2UuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuICAgICAgbmV3RWRnZS50YXJnZXQuZWRnZXMucHVzaChuZXdFZGdlKTtcclxuXHJcbiAgICAgIHJldHVybiBuZXdFZGdlO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChsT2JqKSB7XHJcbiAgaWYgKGxPYmogaW5zdGFuY2VvZiBMR3JhcGgpIHtcclxuICAgIHZhciBncmFwaCA9IGxPYmo7XHJcbiAgICBpZiAoZ3JhcGguZ2V0R3JhcGhNYW5hZ2VyKCkgIT0gdGhpcykge1xyXG4gICAgICB0aHJvdyBcIkdyYXBoIG5vdCBpbiB0aGlzIGdyYXBoIG1nclwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZ3JhcGggPT0gdGhpcy5yb290R3JhcGggfHwgKGdyYXBoLnBhcmVudCAhPSBudWxsICYmIGdyYXBoLnBhcmVudC5ncmFwaE1hbmFnZXIgPT0gdGhpcykpKSB7XHJcbiAgICAgIHRocm93IFwiSW52YWxpZCBwYXJlbnQgbm9kZSFcIjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBmaXJzdCB0aGUgZWRnZXMgKG1ha2UgYSBjb3B5IHRvIGRvIGl0IHNhZmVseSlcclxuICAgIHZhciBlZGdlc1RvQmVSZW1vdmVkID0gW107XHJcblxyXG4gICAgZWRnZXNUb0JlUmVtb3ZlZCA9IGVkZ2VzVG9CZVJlbW92ZWQuY29uY2F0KGdyYXBoLmdldEVkZ2VzKCkpO1xyXG5cclxuICAgIHZhciBlZGdlO1xyXG4gICAgdmFyIHMgPSBlZGdlc1RvQmVSZW1vdmVkLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICBlZGdlID0gZWRnZXNUb0JlUmVtb3ZlZFtpXTtcclxuICAgICAgZ3JhcGgucmVtb3ZlKGVkZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHRoZW4gdGhlIG5vZGVzIChtYWtlIGEgY29weSB0byBkbyBpdCBzYWZlbHkpXHJcbiAgICB2YXIgbm9kZXNUb0JlUmVtb3ZlZCA9IFtdO1xyXG5cclxuICAgIG5vZGVzVG9CZVJlbW92ZWQgPSBub2Rlc1RvQmVSZW1vdmVkLmNvbmNhdChncmFwaC5nZXROb2RlcygpKTtcclxuXHJcbiAgICB2YXIgbm9kZTtcclxuICAgIHMgPSBub2Rlc1RvQmVSZW1vdmVkLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gICAge1xyXG4gICAgICBub2RlID0gbm9kZXNUb0JlUmVtb3ZlZFtpXTtcclxuICAgICAgZ3JhcGgucmVtb3ZlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGNoZWNrIGlmIGdyYXBoIGlzIHRoZSByb290XHJcbiAgICBpZiAoZ3JhcGggPT0gdGhpcy5yb290R3JhcGgpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuc2V0Um9vdEdyYXBoKG51bGwpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIG5vdyByZW1vdmUgdGhlIGdyYXBoIGl0c2VsZlxyXG4gICAgdmFyIGluZGV4ID0gdGhpcy5ncmFwaHMuaW5kZXhPZihncmFwaCk7XHJcbiAgICB0aGlzLmdyYXBocy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cclxuICAgIC8vIGFsc28gcmVzZXQgdGhlIHBhcmVudCBvZiB0aGUgZ3JhcGhcclxuICAgIGdyYXBoLnBhcmVudCA9IG51bGw7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKGxPYmogaW5zdGFuY2VvZiBMRWRnZSkge1xyXG4gICAgZWRnZSA9IGxPYmo7XHJcbiAgICBpZiAoZWRnZSA9PSBudWxsKSB7XHJcbiAgICAgIHRocm93IFwiRWRnZSBpcyBudWxsIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCFlZGdlLmlzSW50ZXJHcmFwaCkge1xyXG4gICAgICB0aHJvdyBcIk5vdCBhbiBpbnRlci1ncmFwaCBlZGdlIVwiO1xyXG4gICAgfVxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UgIT0gbnVsbCAmJiBlZGdlLnRhcmdldCAhPSBudWxsKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGlzIG51bGwhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVtb3ZlIGVkZ2UgZnJvbSBzb3VyY2UgYW5kIHRhcmdldCBub2RlcycgaW5jaWRlbmN5IGxpc3RzXHJcblxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKSAhPSAtMSAmJiBlZGdlLnRhcmdldC5lZGdlcy5pbmRleE9mKGVkZ2UpICE9IC0xKSkge1xyXG4gICAgICB0aHJvdyBcIlNvdXJjZSBhbmQvb3IgdGFyZ2V0IGRvZXNuJ3Qga25vdyB0aGlzIGVkZ2UhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2UuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIGVkZ2Uuc291cmNlLmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICBpbmRleCA9IGVkZ2UudGFyZ2V0LmVkZ2VzLmluZGV4T2YoZWRnZSk7XHJcbiAgICBlZGdlLnRhcmdldC5lZGdlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cclxuICAgIC8vIHJlbW92ZSBlZGdlIGZyb20gb3duZXIgZ3JhcGggbWFuYWdlcidzIGludGVyLWdyYXBoIGVkZ2UgbGlzdFxyXG5cclxuICAgIGlmICghKGVkZ2Uuc291cmNlLm93bmVyICE9IG51bGwgJiYgZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkgIT0gbnVsbCkpIHtcclxuICAgICAgdGhyb3cgXCJFZGdlIG93bmVyIGdyYXBoIG9yIG93bmVyIGdyYXBoIG1hbmFnZXIgaXMgbnVsbCFcIjtcclxuICAgIH1cclxuICAgIGlmIChlZGdlLnNvdXJjZS5vd25lci5nZXRHcmFwaE1hbmFnZXIoKS5lZGdlcy5pbmRleE9mKGVkZ2UpID09IC0xKSB7XHJcbiAgICAgIHRocm93IFwiTm90IGluIG93bmVyIGdyYXBoIG1hbmFnZXIncyBlZGdlIGxpc3QhXCI7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZGV4ID0gZWRnZS5zb3VyY2Uub3duZXIuZ2V0R3JhcGhNYW5hZ2VyKCkuZWRnZXMuaW5kZXhPZihlZGdlKTtcclxuICAgIGVkZ2Uuc291cmNlLm93bmVyLmdldEdyYXBoTWFuYWdlcigpLmVkZ2VzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMucm9vdEdyYXBoLnVwZGF0ZUJvdW5kcyh0cnVlKTtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEdyYXBocyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5ncmFwaHM7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRBbGxOb2RlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5hbGxOb2RlcyA9PSBudWxsKVxyXG4gIHtcclxuICAgIHZhciBub2RlTGlzdCA9IFtdO1xyXG4gICAgdmFyIGdyYXBocyA9IHRoaXMuZ2V0R3JhcGhzKCk7XHJcbiAgICB2YXIgcyA9IGdyYXBocy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICAgIHtcclxuICAgICAgbm9kZUxpc3QgPSBub2RlTGlzdC5jb25jYXQoZ3JhcGhzW2ldLmdldE5vZGVzKCkpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5hbGxOb2RlcyA9IG5vZGVMaXN0O1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5hbGxOb2RlcztcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLnJlc2V0QWxsTm9kZXMgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdGhpcy5hbGxOb2RlcyA9IG51bGw7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5yZXNldEFsbEVkZ2VzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMuYWxsRWRnZXMgPSBudWxsO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUucmVzZXRBbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gbnVsbDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbEVkZ2VzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLmFsbEVkZ2VzID09IG51bGwpXHJcbiAge1xyXG4gICAgdmFyIGVkZ2VMaXN0ID0gW107XHJcbiAgICB2YXIgZ3JhcGhzID0gdGhpcy5nZXRHcmFwaHMoKTtcclxuICAgIHZhciBzID0gZ3JhcGhzLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JhcGhzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBlZGdlTGlzdCA9IGVkZ2VMaXN0LmNvbmNhdChncmFwaHNbaV0uZ2V0RWRnZXMoKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZWRnZUxpc3QgPSBlZGdlTGlzdC5jb25jYXQodGhpcy5lZGdlcyk7XHJcblxyXG4gICAgdGhpcy5hbGxFZGdlcyA9IGVkZ2VMaXN0O1xyXG4gIH1cclxuICByZXR1cm4gdGhpcy5hbGxFZGdlcztcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuc2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAobm9kZUxpc3QpXHJcbntcclxuICBpZiAodGhpcy5hbGxOb2Rlc1RvQXBwbHlHcmF2aXRhdGlvbiAhPSBudWxsKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcblxyXG4gIHRoaXMuYWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBub2RlTGlzdDtcclxufTtcclxuXHJcbkxHcmFwaE1hbmFnZXIucHJvdG90eXBlLmdldFJvb3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucm9vdEdyYXBoO1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuc2V0Um9vdEdyYXBoID0gZnVuY3Rpb24gKGdyYXBoKVxyXG57XHJcbiAgaWYgKGdyYXBoLmdldEdyYXBoTWFuYWdlcigpICE9IHRoaXMpIHtcclxuICAgIHRocm93IFwiUm9vdCBub3QgaW4gdGhpcyBncmFwaCBtZ3IhXCI7XHJcbiAgfVxyXG5cclxuICB0aGlzLnJvb3RHcmFwaCA9IGdyYXBoO1xyXG4gIC8vIHJvb3QgZ3JhcGggbXVzdCBoYXZlIGEgcm9vdCBub2RlIGFzc29jaWF0ZWQgd2l0aCBpdCBmb3IgY29udmVuaWVuY2VcclxuICBpZiAoZ3JhcGgucGFyZW50ID09IG51bGwpXHJcbiAge1xyXG4gICAgZ3JhcGgucGFyZW50ID0gdGhpcy5sYXlvdXQubmV3Tm9kZShcIlJvb3Qgbm9kZVwiKTtcclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5nZXRMYXlvdXQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubGF5b3V0O1xyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuaXNPbmVBbmNlc3Rvck9mT3RoZXIgPSBmdW5jdGlvbiAoZmlyc3ROb2RlLCBzZWNvbmROb2RlKVxyXG57XHJcbiAgaWYgKCEoZmlyc3ROb2RlICE9IG51bGwgJiYgc2Vjb25kTm9kZSAhPSBudWxsKSkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG5cclxuICBpZiAoZmlyc3ROb2RlID09IHNlY29uZE5vZGUpXHJcbiAge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIC8vIElzIHNlY29uZCBub2RlIGFuIGFuY2VzdG9yIG9mIHRoZSBmaXJzdCBvbmU/XHJcbiAgdmFyIG93bmVyR3JhcGggPSBmaXJzdE5vZGUuZ2V0T3duZXIoKTtcclxuICB2YXIgcGFyZW50Tm9kZTtcclxuXHJcbiAgZG9cclxuICB7XHJcbiAgICBwYXJlbnROb2RlID0gb3duZXJHcmFwaC5nZXRQYXJlbnQoKTtcclxuXHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBudWxsKVxyXG4gICAge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICBpZiAocGFyZW50Tm9kZSA9PSBzZWNvbmROb2RlKVxyXG4gICAge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBvd25lckdyYXBoID0gcGFyZW50Tm9kZS5nZXRPd25lcigpO1xyXG4gICAgaWYgKG93bmVyR3JhcGggPT0gbnVsbClcclxuICAgIHtcclxuICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfSB3aGlsZSAodHJ1ZSk7XHJcbiAgLy8gSXMgZmlyc3Qgbm9kZSBhbiBhbmNlc3RvciBvZiB0aGUgc2Vjb25kIG9uZT9cclxuICBvd25lckdyYXBoID0gc2Vjb25kTm9kZS5nZXRPd25lcigpO1xyXG5cclxuICBkb1xyXG4gIHtcclxuICAgIHBhcmVudE5vZGUgPSBvd25lckdyYXBoLmdldFBhcmVudCgpO1xyXG5cclxuICAgIGlmIChwYXJlbnROb2RlID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChwYXJlbnROb2RlID09IGZpcnN0Tm9kZSlcclxuICAgIHtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgb3duZXJHcmFwaCA9IHBhcmVudE5vZGUuZ2V0T3duZXIoKTtcclxuICAgIGlmIChvd25lckdyYXBoID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH0gd2hpbGUgKHRydWUpO1xyXG5cclxuICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjTG93ZXN0Q29tbW9uQW5jZXN0b3JzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBlZGdlO1xyXG4gIHZhciBzb3VyY2VOb2RlO1xyXG4gIHZhciB0YXJnZXROb2RlO1xyXG4gIHZhciBzb3VyY2VBbmNlc3RvckdyYXBoO1xyXG4gIHZhciB0YXJnZXRBbmNlc3RvckdyYXBoO1xyXG5cclxuICB2YXIgZWRnZXMgPSB0aGlzLmdldEFsbEVkZ2VzKCk7XHJcbiAgdmFyIHMgPSBlZGdlcy5sZW5ndGg7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzOyBpKyspXHJcbiAge1xyXG4gICAgZWRnZSA9IGVkZ2VzW2ldO1xyXG5cclxuICAgIHNvdXJjZU5vZGUgPSBlZGdlLnNvdXJjZTtcclxuICAgIHRhcmdldE5vZGUgPSBlZGdlLnRhcmdldDtcclxuICAgIGVkZ2UubGNhID0gbnVsbDtcclxuICAgIGVkZ2Uuc291cmNlSW5MY2EgPSBzb3VyY2VOb2RlO1xyXG4gICAgZWRnZS50YXJnZXRJbkxjYSA9IHRhcmdldE5vZGU7XHJcblxyXG4gICAgaWYgKHNvdXJjZU5vZGUgPT0gdGFyZ2V0Tm9kZSlcclxuICAgIHtcclxuICAgICAgZWRnZS5sY2EgPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHNvdXJjZUFuY2VzdG9yR3JhcGggPSBzb3VyY2VOb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgd2hpbGUgKGVkZ2UubGNhID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIHRhcmdldEFuY2VzdG9yR3JhcGggPSB0YXJnZXROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgICB3aGlsZSAoZWRnZS5sY2EgPT0gbnVsbClcclxuICAgICAge1xyXG4gICAgICAgIGlmICh0YXJnZXRBbmNlc3RvckdyYXBoID09IHNvdXJjZUFuY2VzdG9yR3JhcGgpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgZWRnZS5sY2EgPSB0YXJnZXRBbmNlc3RvckdyYXBoO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAodGFyZ2V0QW5jZXN0b3JHcmFwaCA9PSB0aGlzLnJvb3RHcmFwaClcclxuICAgICAgICB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChlZGdlLmxjYSAhPSBudWxsKSB7XHJcbiAgICAgICAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWRnZS50YXJnZXRJbkxjYSA9IHRhcmdldEFuY2VzdG9yR3JhcGguZ2V0UGFyZW50KCk7XHJcbiAgICAgICAgdGFyZ2V0QW5jZXN0b3JHcmFwaCA9IGVkZ2UudGFyZ2V0SW5MY2EuZ2V0T3duZXIoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHNvdXJjZUFuY2VzdG9yR3JhcGggPT0gdGhpcy5yb290R3JhcGgpXHJcbiAgICAgIHtcclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVkZ2UubGNhID09IG51bGwpXHJcbiAgICAgIHtcclxuICAgICAgICBlZGdlLnNvdXJjZUluTGNhID0gc291cmNlQW5jZXN0b3JHcmFwaC5nZXRQYXJlbnQoKTtcclxuICAgICAgICBzb3VyY2VBbmNlc3RvckdyYXBoID0gZWRnZS5zb3VyY2VJbkxjYS5nZXRPd25lcigpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVkZ2UubGNhID09IG51bGwpIHtcclxuICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuTEdyYXBoTWFuYWdlci5wcm90b3R5cGUuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9yID0gZnVuY3Rpb24gKGZpcnN0Tm9kZSwgc2Vjb25kTm9kZSlcclxue1xyXG4gIGlmIChmaXJzdE5vZGUgPT0gc2Vjb25kTm9kZSlcclxuICB7XHJcbiAgICByZXR1cm4gZmlyc3ROb2RlLmdldE93bmVyKCk7XHJcbiAgfVxyXG4gIHZhciBmaXJzdE93bmVyR3JhcGggPSBmaXJzdE5vZGUuZ2V0T3duZXIoKTtcclxuXHJcbiAgZG9cclxuICB7XHJcbiAgICBpZiAoZmlyc3RPd25lckdyYXBoID09IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgdmFyIHNlY29uZE93bmVyR3JhcGggPSBzZWNvbmROb2RlLmdldE93bmVyKCk7XHJcblxyXG4gICAgZG9cclxuICAgIHtcclxuICAgICAgaWYgKHNlY29uZE93bmVyR3JhcGggPT0gbnVsbClcclxuICAgICAge1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc2Vjb25kT3duZXJHcmFwaCA9PSBmaXJzdE93bmVyR3JhcGgpXHJcbiAgICAgIHtcclxuICAgICAgICByZXR1cm4gc2Vjb25kT3duZXJHcmFwaDtcclxuICAgICAgfVxyXG4gICAgICBzZWNvbmRPd25lckdyYXBoID0gc2Vjb25kT3duZXJHcmFwaC5nZXRQYXJlbnQoKS5nZXRPd25lcigpO1xyXG4gICAgfSB3aGlsZSAodHJ1ZSk7XHJcblxyXG4gICAgZmlyc3RPd25lckdyYXBoID0gZmlyc3RPd25lckdyYXBoLmdldFBhcmVudCgpLmdldE93bmVyKCk7XHJcbiAgfSB3aGlsZSAodHJ1ZSk7XHJcblxyXG4gIHJldHVybiBmaXJzdE93bmVyR3JhcGg7XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5jYWxjSW5jbHVzaW9uVHJlZURlcHRocyA9IGZ1bmN0aW9uIChncmFwaCwgZGVwdGgpIHtcclxuICBpZiAoZ3JhcGggPT0gbnVsbCAmJiBkZXB0aCA9PSBudWxsKSB7XHJcbiAgICBncmFwaCA9IHRoaXMucm9vdEdyYXBoO1xyXG4gICAgZGVwdGggPSAxO1xyXG4gIH1cclxuICB2YXIgbm9kZTtcclxuXHJcbiAgdmFyIG5vZGVzID0gZ3JhcGguZ2V0Tm9kZXMoKTtcclxuICB2YXIgcyA9IG5vZGVzLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHM7IGkrKylcclxuICB7XHJcbiAgICBub2RlID0gbm9kZXNbaV07XHJcbiAgICBub2RlLmluY2x1c2lvblRyZWVEZXB0aCA9IGRlcHRoO1xyXG5cclxuICAgIGlmIChub2RlLmNoaWxkICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuY2FsY0luY2x1c2lvblRyZWVEZXB0aHMobm9kZS5jaGlsZCwgZGVwdGggKyAxKTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MR3JhcGhNYW5hZ2VyLnByb3RvdHlwZS5pbmNsdWRlc0ludmFsaWRFZGdlID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBlZGdlO1xyXG5cclxuICB2YXIgcyA9IHRoaXMuZWRnZXMubGVuZ3RoO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgczsgaSsrKVxyXG4gIHtcclxuICAgIGVkZ2UgPSB0aGlzLmVkZ2VzW2ldO1xyXG5cclxuICAgIGlmICh0aGlzLmlzT25lQW5jZXN0b3JPZk90aGVyKGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCkpXHJcbiAgICB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gZmFsc2U7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IExHcmFwaE1hbmFnZXI7XHJcbiIsImZ1bmN0aW9uIExHcmFwaE9iamVjdCh2R3JhcGhPYmplY3QpIHtcclxuICB0aGlzLnZHcmFwaE9iamVjdCA9IHZHcmFwaE9iamVjdDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMR3JhcGhPYmplY3Q7XHJcbiIsInZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgSW50ZWdlciA9IHJlcXVpcmUoJy4vSW50ZWdlcicpO1xyXG52YXIgUmVjdGFuZ2xlRCA9IHJlcXVpcmUoJy4vUmVjdGFuZ2xlRCcpO1xyXG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIFJhbmRvbVNlZWQgPSByZXF1aXJlKCcuL1JhbmRvbVNlZWQnKTtcclxudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XHJcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XHJcblxyXG5mdW5jdGlvbiBMTm9kZShnbSwgbG9jLCBzaXplLCB2Tm9kZSkge1xyXG4gIC8vQWx0ZXJuYXRpdmUgY29uc3RydWN0b3IgMSA6IExOb2RlKExHcmFwaE1hbmFnZXIgZ20sIFBvaW50IGxvYywgRGltZW5zaW9uIHNpemUsIE9iamVjdCB2Tm9kZSlcclxuICBpZiAoc2l6ZSA9PSBudWxsICYmIHZOb2RlID09IG51bGwpIHtcclxuICAgIHZOb2RlID0gbG9jO1xyXG4gIH1cclxuXHJcbiAgTEdyYXBoT2JqZWN0LmNhbGwodGhpcywgdk5vZGUpO1xyXG5cclxuICAvL0FsdGVybmF0aXZlIGNvbnN0cnVjdG9yIDIgOiBMTm9kZShMYXlvdXQgbGF5b3V0LCBPYmplY3Qgdk5vZGUpXHJcbiAgaWYgKGdtLmdyYXBoTWFuYWdlciAhPSBudWxsKVxyXG4gICAgZ20gPSBnbS5ncmFwaE1hbmFnZXI7XHJcblxyXG4gIHRoaXMuZXN0aW1hdGVkU2l6ZSA9IEludGVnZXIuTUlOX1ZBTFVFO1xyXG4gIHRoaXMuaW5jbHVzaW9uVHJlZURlcHRoID0gSW50ZWdlci5NQVhfVkFMVUU7XHJcbiAgdGhpcy52R3JhcGhPYmplY3QgPSB2Tm9kZTtcclxuICB0aGlzLmVkZ2VzID0gW107XHJcbiAgdGhpcy5ncmFwaE1hbmFnZXIgPSBnbTtcclxuXHJcbiAgaWYgKHNpemUgIT0gbnVsbCAmJiBsb2MgIT0gbnVsbClcclxuICAgIHRoaXMucmVjdCA9IG5ldyBSZWN0YW5nbGVEKGxvYy54LCBsb2MueSwgc2l6ZS53aWR0aCwgc2l6ZS5oZWlnaHQpO1xyXG4gIGVsc2VcclxuICAgIHRoaXMucmVjdCA9IG5ldyBSZWN0YW5nbGVEKCk7XHJcbn1cclxuXHJcbkxOb2RlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoTEdyYXBoT2JqZWN0LnByb3RvdHlwZSk7XHJcbmZvciAodmFyIHByb3AgaW4gTEdyYXBoT2JqZWN0KSB7XHJcbiAgTE5vZGVbcHJvcF0gPSBMR3JhcGhPYmplY3RbcHJvcF07XHJcbn1cclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRFZGdlcyA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5lZGdlcztcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRDaGlsZCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5jaGlsZDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRPd25lciA9IGZ1bmN0aW9uICgpXHJcbntcclxuICBpZiAodGhpcy5vd25lciAhPSBudWxsKSB7XHJcbiAgICBpZiAoISh0aGlzLm93bmVyID09IG51bGwgfHwgdGhpcy5vd25lci5nZXROb2RlcygpLmluZGV4T2YodGhpcykgPiAtMSkpIHtcclxuICAgICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdGhpcy5vd25lcjtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LndpZHRoO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gKHdpZHRoKVxyXG57XHJcbiAgdGhpcy5yZWN0LndpZHRoID0gd2lkdGg7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0SGVpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QuaGVpZ2h0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXHJcbntcclxuICB0aGlzLnJlY3QuaGVpZ2h0ID0gaGVpZ2h0O1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlclggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC54ICsgdGhpcy5yZWN0LndpZHRoIC8gMjtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRDZW50ZXJZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldENlbnRlciA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLnJlY3QueCArIHRoaXMucmVjdC53aWR0aCAvIDIsXHJcbiAgICAgICAgICB0aGlzLnJlY3QueSArIHRoaXMucmVjdC5oZWlnaHQgLyAyKTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLnJlY3QueCwgdGhpcy5yZWN0LnkpO1xyXG59O1xyXG5cclxuTE5vZGUucHJvdG90eXBlLmdldFJlY3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXREaWFnb25hbCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMucmVjdC53aWR0aCAqIHRoaXMucmVjdC53aWR0aCArXHJcbiAgICAgICAgICB0aGlzLnJlY3QuaGVpZ2h0ICogdGhpcy5yZWN0LmhlaWdodCk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0UmVjdCA9IGZ1bmN0aW9uICh1cHBlckxlZnQsIGRpbWVuc2lvbilcclxue1xyXG4gIHRoaXMucmVjdC54ID0gdXBwZXJMZWZ0Lng7XHJcbiAgdGhpcy5yZWN0LnkgPSB1cHBlckxlZnQueTtcclxuICB0aGlzLnJlY3Qud2lkdGggPSBkaW1lbnNpb24ud2lkdGg7XHJcbiAgdGhpcy5yZWN0LmhlaWdodCA9IGRpbWVuc2lvbi5oZWlnaHQ7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuc2V0Q2VudGVyID0gZnVuY3Rpb24gKGN4LCBjeSlcclxue1xyXG4gIHRoaXMucmVjdC54ID0gY3ggLSB0aGlzLnJlY3Qud2lkdGggLyAyO1xyXG4gIHRoaXMucmVjdC55ID0gY3kgLSB0aGlzLnJlY3QuaGVpZ2h0IC8gMjtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICh4LCB5KVxyXG57XHJcbiAgdGhpcy5yZWN0LnggPSB4O1xyXG4gIHRoaXMucmVjdC55ID0geTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5tb3ZlQnkgPSBmdW5jdGlvbiAoZHgsIGR5KVxyXG57XHJcbiAgdGhpcy5yZWN0LnggKz0gZHg7XHJcbiAgdGhpcy5yZWN0LnkgKz0gZHk7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZUxpc3RUb05vZGUgPSBmdW5jdGlvbiAodG8pXHJcbntcclxuICB2YXIgZWRnZUxpc3QgPSBbXTtcclxuICB2YXIgZWRnZTtcclxuICB2YXIgc2VsZiA9IHRoaXM7XHJcblxyXG4gIHNlbGYuZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XHJcbiAgICBcclxuICAgIGlmIChlZGdlLnRhcmdldCA9PSB0bylcclxuICAgIHtcclxuICAgICAgaWYgKGVkZ2Uuc291cmNlICE9IHNlbGYpXHJcbiAgICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgZWRnZSBzb3VyY2UhXCI7XHJcblxyXG4gICAgICBlZGdlTGlzdC5wdXNoKGVkZ2UpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gZWRnZUxpc3Q7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0RWRnZXNCZXR3ZWVuID0gZnVuY3Rpb24gKG90aGVyKVxyXG57XHJcbiAgdmFyIGVkZ2VMaXN0ID0gW107XHJcbiAgdmFyIGVkZ2U7XHJcbiAgXHJcbiAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gIHNlbGYuZWRnZXMuZm9yRWFjaChmdW5jdGlvbihlZGdlKSB7XHJcblxyXG4gICAgaWYgKCEoZWRnZS5zb3VyY2UgPT0gc2VsZiB8fCBlZGdlLnRhcmdldCA9PSBzZWxmKSlcclxuICAgICAgdGhyb3cgXCJJbmNvcnJlY3QgZWRnZSBzb3VyY2UgYW5kL29yIHRhcmdldFwiO1xyXG5cclxuICAgIGlmICgoZWRnZS50YXJnZXQgPT0gb3RoZXIpIHx8IChlZGdlLnNvdXJjZSA9PSBvdGhlcikpXHJcbiAgICB7XHJcbiAgICAgIGVkZ2VMaXN0LnB1c2goZWRnZSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBlZGdlTGlzdDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXROZWlnaGJvcnNMaXN0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBuZWlnaGJvcnMgPSBuZXcgSGFzaFNldCgpO1xyXG4gIHZhciBlZGdlO1xyXG4gIFxyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBzZWxmLmVkZ2VzLmZvckVhY2goZnVuY3Rpb24oZWRnZSkge1xyXG5cclxuICAgIGlmIChlZGdlLnNvdXJjZSA9PSBzZWxmKVxyXG4gICAge1xyXG4gICAgICBuZWlnaGJvcnMuYWRkKGVkZ2UudGFyZ2V0KTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgaWYgKGVkZ2UudGFyZ2V0ICE9IHNlbGYpIHtcclxuICAgICAgICB0aHJvdyBcIkluY29ycmVjdCBpbmNpZGVuY3khXCI7XHJcbiAgICAgIH1cclxuICAgIFxyXG4gICAgICBuZWlnaGJvcnMuYWRkKGVkZ2Uuc291cmNlKTtcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIG5laWdoYm9ycztcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS53aXRoQ2hpbGRyZW4gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIHdpdGhOZWlnaGJvcnNMaXN0ID0gW107XHJcbiAgdmFyIGNoaWxkTm9kZTtcclxuXHJcbiAgd2l0aE5laWdoYm9yc0xpc3QucHVzaCh0aGlzKTtcclxuXHJcbiAgaWYgKHRoaXMuY2hpbGQgIT0gbnVsbClcclxuICB7XHJcbiAgICB2YXIgbm9kZXMgPSB0aGlzLmNoaWxkLmdldE5vZGVzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBjaGlsZE5vZGUgPSBub2Rlc1tpXTtcclxuXHJcbiAgICAgIHdpdGhOZWlnaGJvcnNMaXN0ID0gd2l0aE5laWdoYm9yc0xpc3QuY29uY2F0KGNoaWxkTm9kZS53aXRoQ2hpbGRyZW4oKSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gd2l0aE5laWdoYm9yc0xpc3Q7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0RXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5lc3RpbWF0ZWRTaXplID09IEludGVnZXIuTUlOX1ZBTFVFKSB7XHJcbiAgICB0aHJvdyBcImFzc2VydCBmYWlsZWRcIjtcclxuICB9XHJcbiAgcmV0dXJuIHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5jYWxjRXN0aW1hdGVkU2l6ZSA9IGZ1bmN0aW9uICgpIHtcclxuICBpZiAodGhpcy5jaGlsZCA9PSBudWxsKVxyXG4gIHtcclxuICAgIHJldHVybiB0aGlzLmVzdGltYXRlZFNpemUgPSBNYXRoLmZsb29yKCh0aGlzLnJlY3Qud2lkdGggKyB0aGlzLnJlY3QuaGVpZ2h0KSAvIDIpO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgdGhpcy5lc3RpbWF0ZWRTaXplID0gdGhpcy5jaGlsZC5jYWxjRXN0aW1hdGVkU2l6ZSgpO1xyXG4gICAgdGhpcy5yZWN0LndpZHRoID0gdGhpcy5lc3RpbWF0ZWRTaXplO1xyXG4gICAgdGhpcy5yZWN0LmhlaWdodCA9IHRoaXMuZXN0aW1hdGVkU2l6ZTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5lc3RpbWF0ZWRTaXplO1xyXG4gIH1cclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5zY2F0dGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciByYW5kb21DZW50ZXJYO1xyXG4gIHZhciByYW5kb21DZW50ZXJZO1xyXG5cclxuICB2YXIgbWluWCA9IC1MYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcclxuICB2YXIgbWF4WCA9IExheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xyXG4gIHJhbmRvbUNlbnRlclggPSBMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1ggK1xyXG4gICAgICAgICAgKFJhbmRvbVNlZWQubmV4dERvdWJsZSgpICogKG1heFggLSBtaW5YKSkgKyBtaW5YO1xyXG5cclxuICB2YXIgbWluWSA9IC1MYXlvdXRDb25zdGFudHMuSU5JVElBTF9XT1JMRF9CT1VOREFSWTtcclxuICB2YXIgbWF4WSA9IExheW91dENvbnN0YW50cy5JTklUSUFMX1dPUkxEX0JPVU5EQVJZO1xyXG4gIHJhbmRvbUNlbnRlclkgPSBMYXlvdXRDb25zdGFudHMuV09STERfQ0VOVEVSX1kgK1xyXG4gICAgICAgICAgKFJhbmRvbVNlZWQubmV4dERvdWJsZSgpICogKG1heFkgLSBtaW5ZKSkgKyBtaW5ZO1xyXG5cclxuICB0aGlzLnJlY3QueCA9IHJhbmRvbUNlbnRlclg7XHJcbiAgdGhpcy5yZWN0LnkgPSByYW5kb21DZW50ZXJZXHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUudXBkYXRlQm91bmRzID0gZnVuY3Rpb24gKCkge1xyXG4gIGlmICh0aGlzLmdldENoaWxkKCkgPT0gbnVsbCkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG4gIGlmICh0aGlzLmdldENoaWxkKCkuZ2V0Tm9kZXMoKS5sZW5ndGggIT0gMClcclxuICB7XHJcbiAgICAvLyB3cmFwIHRoZSBjaGlsZHJlbiBub2RlcyBieSByZS1hcnJhbmdpbmcgdGhlIGJvdW5kYXJpZXNcclxuICAgIHZhciBjaGlsZEdyYXBoID0gdGhpcy5nZXRDaGlsZCgpO1xyXG4gICAgY2hpbGRHcmFwaC51cGRhdGVCb3VuZHModHJ1ZSk7XHJcblxyXG4gICAgdGhpcy5yZWN0LnggPSBjaGlsZEdyYXBoLmdldExlZnQoKTtcclxuICAgIHRoaXMucmVjdC55ID0gY2hpbGRHcmFwaC5nZXRUb3AoKTtcclxuXHJcbiAgICB0aGlzLnNldFdpZHRoKGNoaWxkR3JhcGguZ2V0UmlnaHQoKSAtIGNoaWxkR3JhcGguZ2V0TGVmdCgpKTtcclxuICAgIHRoaXMuc2V0SGVpZ2h0KGNoaWxkR3JhcGguZ2V0Qm90dG9tKCkgLSBjaGlsZEdyYXBoLmdldFRvcCgpKTtcclxuICB9XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0SW5jbHVzaW9uVHJlZURlcHRoID0gZnVuY3Rpb24gKClcclxue1xyXG4gIGlmICh0aGlzLmluY2x1c2lvblRyZWVEZXB0aCA9PSBJbnRlZ2VyLk1BWF9WQUxVRSkge1xyXG4gICAgdGhyb3cgXCJhc3NlcnQgZmFpbGVkXCI7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzLmluY2x1c2lvblRyZWVEZXB0aDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAodHJhbnMpXHJcbntcclxuICB2YXIgbGVmdCA9IHRoaXMucmVjdC54O1xyXG5cclxuICBpZiAobGVmdCA+IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcclxuICB7XHJcbiAgICBsZWZ0ID0gTGF5b3V0Q29uc3RhbnRzLldPUkxEX0JPVU5EQVJZO1xyXG4gIH1cclxuICBlbHNlIGlmIChsZWZ0IDwgLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcclxuICB7XHJcbiAgICBsZWZ0ID0gLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcclxuICB9XHJcblxyXG4gIHZhciB0b3AgPSB0aGlzLnJlY3QueTtcclxuXHJcbiAgaWYgKHRvcCA+IExheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSlcclxuICB7XHJcbiAgICB0b3AgPSBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHRvcCA8IC1MYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkpXHJcbiAge1xyXG4gICAgdG9wID0gLUxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWTtcclxuICB9XHJcblxyXG4gIHZhciBsZWZ0VG9wID0gbmV3IFBvaW50RChsZWZ0LCB0b3ApO1xyXG4gIHZhciB2TGVmdFRvcCA9IHRyYW5zLmludmVyc2VUcmFuc2Zvcm1Qb2ludChsZWZ0VG9wKTtcclxuXHJcbiAgdGhpcy5zZXRMb2NhdGlvbih2TGVmdFRvcC54LCB2TGVmdFRvcC55KTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRMZWZ0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRSaWdodCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5yZWN0LnggKyB0aGlzLnJlY3Qud2lkdGg7XHJcbn07XHJcblxyXG5MTm9kZS5wcm90b3R5cGUuZ2V0VG9wID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnJlY3QueTtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRCb3R0b20gPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMucmVjdC55ICsgdGhpcy5yZWN0LmhlaWdodDtcclxufTtcclxuXHJcbkxOb2RlLnByb3RvdHlwZS5nZXRQYXJlbnQgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgaWYgKHRoaXMub3duZXIgPT0gbnVsbClcclxuICB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzLm93bmVyLmdldFBhcmVudCgpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMTm9kZTtcclxuIiwidmFyIExheW91dENvbnN0YW50cyA9IHJlcXVpcmUoJy4vTGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBIYXNoTWFwID0gcmVxdWlyZSgnLi9IYXNoTWFwJyk7XHJcbnZhciBMR3JhcGhNYW5hZ2VyID0gcmVxdWlyZSgnLi9MR3JhcGhNYW5hZ2VyJyk7XHJcbnZhciBMTm9kZSA9IHJlcXVpcmUoJy4vTE5vZGUnKTtcclxudmFyIExFZGdlID0gcmVxdWlyZSgnLi9MRWRnZScpO1xyXG52YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcclxudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpO1xyXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJy4vRW1pdHRlcicpO1xyXG52YXIgSGFzaFNldCA9IHJlcXVpcmUoJy4vSGFzaFNldCcpO1xyXG5cclxuZnVuY3Rpb24gTGF5b3V0KGlzUmVtb3RlVXNlKSB7XHJcbiAgRW1pdHRlci5jYWxsKCB0aGlzICk7XHJcblxyXG4gIC8vTGF5b3V0IFF1YWxpdHk6IDA6cHJvb2YsIDE6ZGVmYXVsdCwgMjpkcmFmdFxyXG4gIHRoaXMubGF5b3V0UXVhbGl0eSA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX1FVQUxJVFk7XHJcbiAgLy9XaGV0aGVyIGxheW91dCBzaG91bGQgY3JlYXRlIGJlbmRwb2ludHMgYXMgbmVlZGVkIG9yIG5vdFxyXG4gIHRoaXMuY3JlYXRlQmVuZHNBc05lZWRlZCA9XHJcbiAgICAgICAgICBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEO1xyXG4gIC8vV2hldGhlciBsYXlvdXQgc2hvdWxkIGJlIGluY3JlbWVudGFsIG9yIG5vdFxyXG4gIHRoaXMuaW5jcmVtZW50YWwgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTDtcclxuICAvL1doZXRoZXIgd2UgYW5pbWF0ZSBmcm9tIGJlZm9yZSB0byBhZnRlciBsYXlvdXQgbm9kZSBwb3NpdGlvbnNcclxuICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID1cclxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9PTl9MQVlPVVQ7XHJcbiAgLy9XaGV0aGVyIHdlIGFuaW1hdGUgdGhlIGxheW91dCBwcm9jZXNzIG9yIG5vdFxyXG4gIHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XHJcbiAgLy9OdW1iZXIgaXRlcmF0aW9ucyB0aGF0IHNob3VsZCBiZSBkb25lIGJldHdlZW4gdHdvIHN1Y2Nlc3NpdmUgYW5pbWF0aW9uc1xyXG4gIHRoaXMuYW5pbWF0aW9uUGVyaW9kID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX1BFUklPRDtcclxuICAvKipcclxuICAgKiBXaGV0aGVyIG9yIG5vdCBsZWFmIG5vZGVzIChub24tY29tcG91bmQgbm9kZXMpIGFyZSBvZiB1bmlmb3JtIHNpemVzLiBXaGVuXHJcbiAgICogdGhleSBhcmUsIGJvdGggc3ByaW5nIGFuZCByZXB1bHNpb24gZm9yY2VzIGJldHdlZW4gdHdvIGxlYWYgbm9kZXMgY2FuIGJlXHJcbiAgICogY2FsY3VsYXRlZCB3aXRob3V0IHRoZSBleHBlbnNpdmUgY2xpcHBpbmcgcG9pbnQgY2FsY3VsYXRpb25zLCByZXN1bHRpbmdcclxuICAgKiBpbiBtYWpvciBzcGVlZC11cC5cclxuICAgKi9cclxuICB0aGlzLnVuaWZvcm1MZWFmTm9kZVNpemVzID1cclxuICAgICAgICAgIExheW91dENvbnN0YW50cy5ERUZBVUxUX1VOSUZPUk1fTEVBRl9OT0RFX1NJWkVTO1xyXG4gIC8qKlxyXG4gICAqIFRoaXMgaXMgdXNlZCBmb3IgY3JlYXRpb24gb2YgYmVuZHBvaW50cyBieSB1c2luZyBkdW1teSBub2RlcyBhbmQgZWRnZXMuXHJcbiAgICogTWFwcyBhbiBMRWRnZSB0byBpdHMgZHVtbXkgYmVuZHBvaW50IHBhdGguXHJcbiAgICovXHJcbiAgdGhpcy5lZGdlVG9EdW1teU5vZGVzID0gbmV3IEhhc2hNYXAoKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IG5ldyBMR3JhcGhNYW5hZ2VyKHRoaXMpO1xyXG4gIHRoaXMuaXNMYXlvdXRGaW5pc2hlZCA9IGZhbHNlO1xyXG4gIHRoaXMuaXNTdWJMYXlvdXQgPSBmYWxzZTtcclxuICB0aGlzLmlzUmVtb3RlVXNlID0gZmFsc2U7XHJcblxyXG4gIGlmIChpc1JlbW90ZVVzZSAhPSBudWxsKSB7XHJcbiAgICB0aGlzLmlzUmVtb3RlVXNlID0gaXNSZW1vdGVVc2U7XHJcbiAgfVxyXG59XHJcblxyXG5MYXlvdXQuUkFORE9NX1NFRUQgPSAxO1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIEVtaXR0ZXIucHJvdG90eXBlICk7XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLmdldEdyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXI7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLmdldEFsbE5vZGVzID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLmdyYXBoTWFuYWdlci5nZXRBbGxOb2RlcygpO1xyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS5nZXRBbGxFZGdlcyA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5ncmFwaE1hbmFnZXIuZ2V0QWxsRWRnZXMoKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUuZ2V0QWxsTm9kZXNUb0FwcGx5R3Jhdml0YXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbE5vZGVzVG9BcHBseUdyYXZpdGF0aW9uKCk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLm5ld0dyYXBoTWFuYWdlciA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgZ20gPSBuZXcgTEdyYXBoTWFuYWdlcih0aGlzKTtcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xyXG4gIHJldHVybiBnbTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUubmV3R3JhcGggPSBmdW5jdGlvbiAodkdyYXBoKVxyXG57XHJcbiAgcmV0dXJuIG5ldyBMR3JhcGgobnVsbCwgdGhpcy5ncmFwaE1hbmFnZXIsIHZHcmFwaCk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLm5ld05vZGUgPSBmdW5jdGlvbiAodk5vZGUpXHJcbntcclxuICByZXR1cm4gbmV3IExOb2RlKHRoaXMuZ3JhcGhNYW5hZ2VyLCB2Tm9kZSk7XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLm5ld0VkZ2UgPSBmdW5jdGlvbiAodkVkZ2UpXHJcbntcclxuICByZXR1cm4gbmV3IExFZGdlKG51bGwsIG51bGwsIHZFZGdlKTtcclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUucnVuTGF5b3V0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHRoaXMuaXNMYXlvdXRGaW5pc2hlZCA9IGZhbHNlO1xyXG4gIFxyXG4gIGlmICh0aGlzLnRpbGluZ1ByZUxheW91dCkge1xyXG4gICAgdGhpcy50aWxpbmdQcmVMYXlvdXQoKTtcclxuICB9XHJcblxyXG4gIHRoaXMuaW5pdFBhcmFtZXRlcnMoKTtcclxuICB2YXIgaXNMYXlvdXRTdWNjZXNzZnVsbDtcclxuXHJcbiAgaWYgKCh0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkgPT0gbnVsbClcclxuICAgICAgICAgIHx8IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpLmxlbmd0aCA9PSAwXHJcbiAgICAgICAgICB8fCB0aGlzLmdyYXBoTWFuYWdlci5pbmNsdWRlc0ludmFsaWRFZGdlKCkpXHJcbiAge1xyXG4gICAgaXNMYXlvdXRTdWNjZXNzZnVsbCA9IGZhbHNlO1xyXG4gIH1cclxuICBlbHNlXHJcbiAge1xyXG4gICAgLy8gY2FsY3VsYXRlIGV4ZWN1dGlvbiB0aW1lXHJcbiAgICB2YXIgc3RhcnRUaW1lID0gMDtcclxuXHJcbiAgICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAgICB7XHJcbiAgICAgIHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpXHJcbiAgICB9XHJcblxyXG4gICAgaXNMYXlvdXRTdWNjZXNzZnVsbCA9IHRoaXMubGF5b3V0KCk7XHJcblxyXG4gICAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxyXG4gICAge1xyXG4gICAgICB2YXIgZW5kVGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgICB2YXIgZXhjVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoaXNMYXlvdXRTdWNjZXNzZnVsbClcclxuICB7XHJcbiAgICBpZiAoIXRoaXMuaXNTdWJMYXlvdXQpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMuZG9Qb3N0TGF5b3V0KCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAodGhpcy50aWxpbmdQb3N0TGF5b3V0KSB7XHJcbiAgICB0aGlzLnRpbGluZ1Bvc3RMYXlvdXQoKTtcclxuICB9XHJcblxyXG4gIHRoaXMuaXNMYXlvdXRGaW5pc2hlZCA9IHRydWU7XHJcblxyXG4gIHJldHVybiBpc0xheW91dFN1Y2Nlc3NmdWxsO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIHBlcmZvcm1zIHRoZSBvcGVyYXRpb25zIHJlcXVpcmVkIGFmdGVyIGxheW91dC5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuZG9Qb3N0TGF5b3V0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIC8vYXNzZXJ0ICFpc1N1YkxheW91dCA6IFwiU2hvdWxkIG5vdCBiZSBjYWxsZWQgb24gc3ViLWxheW91dCFcIjtcclxuICAvLyBQcm9wYWdhdGUgZ2VvbWV0cmljIGNoYW5nZXMgdG8gdi1sZXZlbCBvYmplY3RzXHJcbiAgdGhpcy50cmFuc2Zvcm0oKTtcclxuICB0aGlzLnVwZGF0ZSgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIHVwZGF0ZXMgdGhlIGdlb21ldHJ5IG9mIHRoZSB0YXJnZXQgZ3JhcGggYWNjb3JkaW5nIHRvXHJcbiAqIGNhbGN1bGF0ZWQgbGF5b3V0LlxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS51cGRhdGUyID0gZnVuY3Rpb24gKCkge1xyXG4gIC8vIHVwZGF0ZSBiZW5kIHBvaW50c1xyXG4gIGlmICh0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQpXHJcbiAge1xyXG4gICAgdGhpcy5jcmVhdGVCZW5kcG9pbnRzRnJvbUR1bW15Tm9kZXMoKTtcclxuXHJcbiAgICAvLyByZXNldCBhbGwgZWRnZXMsIHNpbmNlIHRoZSB0b3BvbG9neSBoYXMgY2hhbmdlZFxyXG4gICAgdGhpcy5ncmFwaE1hbmFnZXIucmVzZXRBbGxFZGdlcygpO1xyXG4gIH1cclxuXHJcbiAgLy8gcGVyZm9ybSBlZGdlLCBub2RlIGFuZCByb290IHVwZGF0ZXMgaWYgbGF5b3V0IGlzIG5vdCBjYWxsZWRcclxuICAvLyByZW1vdGVseVxyXG4gIGlmICghdGhpcy5pc1JlbW90ZVVzZSlcclxuICB7XHJcbiAgICAvLyB1cGRhdGUgYWxsIGVkZ2VzXHJcbiAgICB2YXIgZWRnZTtcclxuICAgIHZhciBhbGxFZGdlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFsbEVkZ2VzLmxlbmd0aDsgaSsrKVxyXG4gICAge1xyXG4gICAgICBlZGdlID0gYWxsRWRnZXNbaV07XHJcbi8vICAgICAgdGhpcy51cGRhdGUoZWRnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmVjdXJzaXZlbHkgdXBkYXRlIG5vZGVzXHJcbiAgICB2YXIgbm9kZTtcclxuICAgIHZhciBub2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgbm9kZSA9IG5vZGVzW2ldO1xyXG4vLyAgICAgIHRoaXMudXBkYXRlKG5vZGUpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHVwZGF0ZSByb290IGdyYXBoXHJcbiAgICB0aGlzLnVwZGF0ZSh0aGlzLmdyYXBoTWFuYWdlci5nZXRSb290KCkpO1xyXG4gIH1cclxufTtcclxuXHJcbkxheW91dC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGlmIChvYmogPT0gbnVsbCkge1xyXG4gICAgdGhpcy51cGRhdGUyKCk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExOb2RlKSB7XHJcbiAgICB2YXIgbm9kZSA9IG9iajtcclxuICAgIGlmIChub2RlLmdldENoaWxkKCkgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgLy8gc2luY2Ugbm9kZSBpcyBjb21wb3VuZCwgcmVjdXJzaXZlbHkgdXBkYXRlIGNoaWxkIG5vZGVzXHJcbiAgICAgIHZhciBub2RlcyA9IG5vZGUuZ2V0Q2hpbGQoKS5nZXROb2RlcygpO1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKVxyXG4gICAgICB7XHJcbiAgICAgICAgdXBkYXRlKG5vZGVzW2ldKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHRoZSBsLWxldmVsIG5vZGUgaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXHJcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBub2RlIGltcGxlbWVudHMgdGhlXHJcbiAgICAvLyBpbnRlcmZhY2UgVXBkYXRhYmxlLlxyXG4gICAgaWYgKG5vZGUudkdyYXBoT2JqZWN0ICE9IG51bGwpXHJcbiAgICB7XHJcbiAgICAgIC8vIGNhc3QgdG8gVXBkYXRhYmxlIHdpdGhvdXQgYW55IHR5cGUgY2hlY2tcclxuICAgICAgdmFyIHZOb2RlID0gbm9kZS52R3JhcGhPYmplY3Q7XHJcblxyXG4gICAgICAvLyBjYWxsIHRoZSB1cGRhdGUgbWV0aG9kIG9mIHRoZSBpbnRlcmZhY2VcclxuICAgICAgdk5vZGUudXBkYXRlKG5vZGUpO1xyXG4gICAgfVxyXG4gIH1cclxuICBlbHNlIGlmIChvYmogaW5zdGFuY2VvZiBMRWRnZSkge1xyXG4gICAgdmFyIGVkZ2UgPSBvYmo7XHJcbiAgICAvLyBpZiB0aGUgbC1sZXZlbCBlZGdlIGlzIGFzc29jaWF0ZWQgd2l0aCBhIHYtbGV2ZWwgZ3JhcGggb2JqZWN0LFxyXG4gICAgLy8gdGhlbiBpdCBpcyBhc3N1bWVkIHRoYXQgdGhlIHYtbGV2ZWwgZWRnZSBpbXBsZW1lbnRzIHRoZVxyXG4gICAgLy8gaW50ZXJmYWNlIFVwZGF0YWJsZS5cclxuXHJcbiAgICBpZiAoZWRnZS52R3JhcGhPYmplY3QgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgLy8gY2FzdCB0byBVcGRhdGFibGUgd2l0aG91dCBhbnkgdHlwZSBjaGVja1xyXG4gICAgICB2YXIgdkVkZ2UgPSBlZGdlLnZHcmFwaE9iamVjdDtcclxuXHJcbiAgICAgIC8vIGNhbGwgdGhlIHVwZGF0ZSBtZXRob2Qgb2YgdGhlIGludGVyZmFjZVxyXG4gICAgICB2RWRnZS51cGRhdGUoZWRnZSk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIGVsc2UgaWYgKG9iaiBpbnN0YW5jZW9mIExHcmFwaCkge1xyXG4gICAgdmFyIGdyYXBoID0gb2JqO1xyXG4gICAgLy8gaWYgdGhlIGwtbGV2ZWwgZ3JhcGggaXMgYXNzb2NpYXRlZCB3aXRoIGEgdi1sZXZlbCBncmFwaCBvYmplY3QsXHJcbiAgICAvLyB0aGVuIGl0IGlzIGFzc3VtZWQgdGhhdCB0aGUgdi1sZXZlbCBvYmplY3QgaW1wbGVtZW50cyB0aGVcclxuICAgIC8vIGludGVyZmFjZSBVcGRhdGFibGUuXHJcblxyXG4gICAgaWYgKGdyYXBoLnZHcmFwaE9iamVjdCAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICAvLyBjYXN0IHRvIFVwZGF0YWJsZSB3aXRob3V0IGFueSB0eXBlIGNoZWNrXHJcbiAgICAgIHZhciB2R3JhcGggPSBncmFwaC52R3JhcGhPYmplY3Q7XHJcblxyXG4gICAgICAvLyBjYWxsIHRoZSB1cGRhdGUgbWV0aG9kIG9mIHRoZSBpbnRlcmZhY2VcclxuICAgICAgdkdyYXBoLnVwZGF0ZShncmFwaCk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGlzIHVzZWQgdG8gc2V0IGFsbCBsYXlvdXQgcGFyYW1ldGVycyB0byBkZWZhdWx0IHZhbHVlc1xyXG4gKiBkZXRlcm1pbmVkIGF0IGNvbXBpbGUgdGltZS5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuaW5pdFBhcmFtZXRlcnMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgaWYgKCF0aGlzLmlzU3ViTGF5b3V0KVxyXG4gIHtcclxuICAgIHRoaXMubGF5b3V0UXVhbGl0eSA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX1FVQUxJVFk7XHJcbiAgICB0aGlzLmFuaW1hdGlvbkR1cmluZ0xheW91dCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9PTl9MQVlPVVQ7XHJcbiAgICB0aGlzLmFuaW1hdGlvblBlcmlvZCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0FOSU1BVElPTl9QRVJJT0Q7XHJcbiAgICB0aGlzLmFuaW1hdGlvbk9uTGF5b3V0ID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQ7XHJcbiAgICB0aGlzLmluY3JlbWVudGFsID0gTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUw7XHJcbiAgICB0aGlzLmNyZWF0ZUJlbmRzQXNOZWVkZWQgPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEO1xyXG4gICAgdGhpcy51bmlmb3JtTGVhZk5vZGVTaXplcyA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX1VOSUZPUk1fTEVBRl9OT0RFX1NJWkVTO1xyXG4gIH1cclxuXHJcbiAgaWYgKHRoaXMuYW5pbWF0aW9uRHVyaW5nTGF5b3V0KVxyXG4gIHtcclxuICAgIGFuaW1hdGlvbk9uTGF5b3V0ID0gZmFsc2U7XHJcbiAgfVxyXG59O1xyXG5cclxuTGF5b3V0LnByb3RvdHlwZS50cmFuc2Zvcm0gPSBmdW5jdGlvbiAobmV3TGVmdFRvcCkge1xyXG4gIGlmIChuZXdMZWZ0VG9wID09IHVuZGVmaW5lZCkge1xyXG4gICAgdGhpcy50cmFuc2Zvcm0obmV3IFBvaW50RCgwLCAwKSk7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgLy8gY3JlYXRlIGEgdHJhbnNmb3JtYXRpb24gb2JqZWN0IChmcm9tIEVjbGlwc2UgdG8gbGF5b3V0KS4gV2hlbiBhblxyXG4gICAgLy8gaW52ZXJzZSB0cmFuc2Zvcm0gaXMgYXBwbGllZCwgd2UgZ2V0IHVwcGVyLWxlZnQgY29vcmRpbmF0ZSBvZiB0aGVcclxuICAgIC8vIGRyYXdpbmcgb3IgdGhlIHJvb3QgZ3JhcGggYXQgZ2l2ZW4gaW5wdXQgY29vcmRpbmF0ZSAoc29tZSBtYXJnaW5zXHJcbiAgICAvLyBhbHJlYWR5IGluY2x1ZGVkIGluIGNhbGN1bGF0aW9uIG9mIGxlZnQtdG9wKS5cclxuXHJcbiAgICB2YXIgdHJhbnMgPSBuZXcgVHJhbnNmb3JtKCk7XHJcbiAgICB2YXIgbGVmdFRvcCA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS51cGRhdGVMZWZ0VG9wKCk7XHJcblxyXG4gICAgaWYgKGxlZnRUb3AgIT0gbnVsbClcclxuICAgIHtcclxuICAgICAgdHJhbnMuc2V0V29ybGRPcmdYKG5ld0xlZnRUb3AueCk7XHJcbiAgICAgIHRyYW5zLnNldFdvcmxkT3JnWShuZXdMZWZ0VG9wLnkpO1xyXG5cclxuICAgICAgdHJhbnMuc2V0RGV2aWNlT3JnWChsZWZ0VG9wLngpO1xyXG4gICAgICB0cmFucy5zZXREZXZpY2VPcmdZKGxlZnRUb3AueSk7XHJcblxyXG4gICAgICB2YXIgbm9kZXMgPSB0aGlzLmdldEFsbE5vZGVzKCk7XHJcbiAgICAgIHZhciBub2RlO1xyXG5cclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgICAge1xyXG4gICAgICAgIG5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgICBub2RlLnRyYW5zZm9ybSh0cmFucyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MYXlvdXQucHJvdG90eXBlLnBvc2l0aW9uTm9kZXNSYW5kb21seSA9IGZ1bmN0aW9uIChncmFwaCkge1xyXG5cclxuICBpZiAoZ3JhcGggPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAvL2Fzc2VydCAhdGhpcy5pbmNyZW1lbnRhbDtcclxuICAgIHRoaXMucG9zaXRpb25Ob2Rlc1JhbmRvbWx5KHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpKTtcclxuICAgIHRoaXMuZ2V0R3JhcGhNYW5hZ2VyKCkuZ2V0Um9vdCgpLnVwZGF0ZUJvdW5kcyh0cnVlKTtcclxuICB9XHJcbiAgZWxzZSB7XHJcbiAgICB2YXIgbE5vZGU7XHJcbiAgICB2YXIgY2hpbGRHcmFwaDtcclxuXHJcbiAgICB2YXIgbm9kZXMgPSBncmFwaC5nZXROb2RlcygpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKylcclxuICAgIHtcclxuICAgICAgbE5vZGUgPSBub2Rlc1tpXTtcclxuICAgICAgY2hpbGRHcmFwaCA9IGxOb2RlLmdldENoaWxkKCk7XHJcblxyXG4gICAgICBpZiAoY2hpbGRHcmFwaCA9PSBudWxsKVxyXG4gICAgICB7XHJcbiAgICAgICAgbE5vZGUuc2NhdHRlcigpO1xyXG4gICAgICB9XHJcbiAgICAgIGVsc2UgaWYgKGNoaWxkR3JhcGguZ2V0Tm9kZXMoKS5sZW5ndGggPT0gMClcclxuICAgICAge1xyXG4gICAgICAgIGxOb2RlLnNjYXR0ZXIoKTtcclxuICAgICAgfVxyXG4gICAgICBlbHNlXHJcbiAgICAgIHtcclxuICAgICAgICB0aGlzLnBvc2l0aW9uTm9kZXNSYW5kb21seShjaGlsZEdyYXBoKTtcclxuICAgICAgICBsTm9kZS51cGRhdGVCb3VuZHMoKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIG1ldGhvZCByZXR1cm5zIGEgbGlzdCBvZiB0cmVlcyB3aGVyZSBlYWNoIHRyZWUgaXMgcmVwcmVzZW50ZWQgYXMgYVxyXG4gKiBsaXN0IG9mIGwtbm9kZXMuIFRoZSBtZXRob2QgcmV0dXJucyBhIGxpc3Qgb2Ygc2l6ZSAwIHdoZW46XHJcbiAqIC0gVGhlIGdyYXBoIGlzIG5vdCBmbGF0IG9yXHJcbiAqIC0gT25lIG9mIHRoZSBjb21wb25lbnQocykgb2YgdGhlIGdyYXBoIGlzIG5vdCBhIHRyZWUuXHJcbiAqL1xyXG5MYXlvdXQucHJvdG90eXBlLmdldEZsYXRGb3Jlc3QgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgdmFyIGZsYXRGb3Jlc3QgPSBbXTtcclxuICB2YXIgaXNGb3Jlc3QgPSB0cnVlO1xyXG5cclxuICAvLyBRdWljayByZWZlcmVuY2UgZm9yIGFsbCBub2RlcyBpbiB0aGUgZ3JhcGggbWFuYWdlciBhc3NvY2lhdGVkIHdpdGhcclxuICAvLyB0aGlzIGxheW91dC4gVGhlIGxpc3Qgc2hvdWxkIG5vdCBiZSBjaGFuZ2VkLlxyXG4gIHZhciBhbGxOb2RlcyA9IHRoaXMuZ3JhcGhNYW5hZ2VyLmdldFJvb3QoKS5nZXROb2RlcygpO1xyXG5cclxuICAvLyBGaXJzdCBiZSBzdXJlIHRoYXQgdGhlIGdyYXBoIGlzIGZsYXRcclxuICB2YXIgaXNGbGF0ID0gdHJ1ZTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbGxOb2Rlcy5sZW5ndGg7IGkrKylcclxuICB7XHJcbiAgICBpZiAoYWxsTm9kZXNbaV0uZ2V0Q2hpbGQoKSAhPSBudWxsKVxyXG4gICAge1xyXG4gICAgICBpc0ZsYXQgPSBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIFJldHVybiBlbXB0eSBmb3Jlc3QgaWYgdGhlIGdyYXBoIGlzIG5vdCBmbGF0LlxyXG4gIGlmICghaXNGbGF0KVxyXG4gIHtcclxuICAgIHJldHVybiBmbGF0Rm9yZXN0O1xyXG4gIH1cclxuXHJcbiAgLy8gUnVuIEJGUyBmb3IgZWFjaCBjb21wb25lbnQgb2YgdGhlIGdyYXBoLlxyXG5cclxuICB2YXIgdmlzaXRlZCA9IG5ldyBIYXNoU2V0KCk7XHJcbiAgdmFyIHRvQmVWaXNpdGVkID0gW107XHJcbiAgdmFyIHBhcmVudHMgPSBuZXcgSGFzaE1hcCgpO1xyXG4gIHZhciB1blByb2Nlc3NlZE5vZGVzID0gW107XHJcblxyXG4gIHVuUHJvY2Vzc2VkTm9kZXMgPSB1blByb2Nlc3NlZE5vZGVzLmNvbmNhdChhbGxOb2Rlcyk7XHJcblxyXG4gIC8vIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCBmaW5kcyBhIGNvbXBvbmVudCBvZiB0aGUgZ3JhcGggYW5kXHJcbiAgLy8gZGVjaWRlcyB3aGV0aGVyIGl0IGlzIGEgdHJlZSBvciBub3QuIElmIGl0IGlzIGEgdHJlZSwgYWRkcyBpdCB0byB0aGVcclxuICAvLyBmb3Jlc3QgYW5kIGNvbnRpbnVlZCB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudC5cclxuXHJcbiAgd2hpbGUgKHVuUHJvY2Vzc2VkTm9kZXMubGVuZ3RoID4gMCAmJiBpc0ZvcmVzdClcclxuICB7XHJcbiAgICB0b0JlVmlzaXRlZC5wdXNoKHVuUHJvY2Vzc2VkTm9kZXNbMF0pO1xyXG5cclxuICAgIC8vIFN0YXJ0IHRoZSBCRlMuIEVhY2ggaXRlcmF0aW9uIG9mIHRoaXMgbG9vcCB2aXNpdHMgYSBub2RlIGluIGFcclxuICAgIC8vIEJGUyBtYW5uZXIuXHJcbiAgICB3aGlsZSAodG9CZVZpc2l0ZWQubGVuZ3RoID4gMCAmJiBpc0ZvcmVzdClcclxuICAgIHtcclxuICAgICAgLy9wb29sIG9wZXJhdGlvblxyXG4gICAgICB2YXIgY3VycmVudE5vZGUgPSB0b0JlVmlzaXRlZFswXTtcclxuICAgICAgdG9CZVZpc2l0ZWQuc3BsaWNlKDAsIDEpO1xyXG4gICAgICB2aXNpdGVkLmFkZChjdXJyZW50Tm9kZSk7XHJcblxyXG4gICAgICAvLyBUcmF2ZXJzZSBhbGwgbmVpZ2hib3JzIG9mIHRoaXMgbm9kZVxyXG4gICAgICB2YXIgbmVpZ2hib3JFZGdlcyA9IGN1cnJlbnROb2RlLmdldEVkZ2VzKCk7XHJcblxyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5laWdoYm9yRWRnZXMubGVuZ3RoOyBpKyspXHJcbiAgICAgIHtcclxuICAgICAgICB2YXIgY3VycmVudE5laWdoYm9yID1cclxuICAgICAgICAgICAgICAgIG5laWdoYm9yRWRnZXNbaV0uZ2V0T3RoZXJFbmQoY3VycmVudE5vZGUpO1xyXG5cclxuICAgICAgICAvLyBJZiBCRlMgaXMgbm90IGdyb3dpbmcgZnJvbSB0aGlzIG5laWdoYm9yLlxyXG4gICAgICAgIGlmIChwYXJlbnRzLmdldChjdXJyZW50Tm9kZSkgIT0gY3VycmVudE5laWdoYm9yKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgIC8vIFdlIGhhdmVuJ3QgcHJldmlvdXNseSB2aXNpdGVkIHRoaXMgbmVpZ2hib3IuXHJcbiAgICAgICAgICBpZiAoIXZpc2l0ZWQuY29udGFpbnMoY3VycmVudE5laWdoYm9yKSlcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdG9CZVZpc2l0ZWQucHVzaChjdXJyZW50TmVpZ2hib3IpO1xyXG4gICAgICAgICAgICBwYXJlbnRzLnB1dChjdXJyZW50TmVpZ2hib3IsIGN1cnJlbnROb2RlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIC8vIFNpbmNlIHdlIGhhdmUgcHJldmlvdXNseSB2aXNpdGVkIHRoaXMgbmVpZ2hib3IgYW5kXHJcbiAgICAgICAgICAvLyB0aGlzIG5laWdoYm9yIGlzIG5vdCBwYXJlbnQgb2YgY3VycmVudE5vZGUsIGdpdmVuXHJcbiAgICAgICAgICAvLyBncmFwaCBjb250YWlucyBhIGNvbXBvbmVudCB0aGF0IGlzIG5vdCB0cmVlLCBoZW5jZVxyXG4gICAgICAgICAgLy8gaXQgaXMgbm90IGEgZm9yZXN0LlxyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBpc0ZvcmVzdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBUaGUgZ3JhcGggY29udGFpbnMgYSBjb21wb25lbnQgdGhhdCBpcyBub3QgYSB0cmVlLiBFbXB0eVxyXG4gICAgLy8gcHJldmlvdXNseSBmb3VuZCB0cmVlcy4gVGhlIG1ldGhvZCB3aWxsIGVuZC5cclxuICAgIGlmICghaXNGb3Jlc3QpXHJcbiAgICB7XHJcbiAgICAgIGZsYXRGb3Jlc3QgPSBbXTtcclxuICAgIH1cclxuICAgIC8vIFNhdmUgY3VycmVudGx5IHZpc2l0ZWQgbm9kZXMgYXMgYSB0cmVlIGluIG91ciBmb3Jlc3QuIFJlc2V0XHJcbiAgICAvLyB2aXNpdGVkIGFuZCBwYXJlbnRzIGxpc3RzLiBDb250aW51ZSB3aXRoIHRoZSBuZXh0IGNvbXBvbmVudCBvZlxyXG4gICAgLy8gdGhlIGdyYXBoLCBpZiBhbnkuXHJcbiAgICBlbHNlXHJcbiAgICB7XHJcbiAgICAgIHZhciB0ZW1wID0gW107XHJcbiAgICAgIHZpc2l0ZWQuYWRkQWxsVG8odGVtcCk7XHJcbiAgICAgIGZsYXRGb3Jlc3QucHVzaCh0ZW1wKTtcclxuICAgICAgLy9mbGF0Rm9yZXN0ID0gZmxhdEZvcmVzdC5jb25jYXQodGVtcCk7XHJcbiAgICAgIC8vdW5Qcm9jZXNzZWROb2Rlcy5yZW1vdmVBbGwodmlzaXRlZCk7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGVtcC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IHRlbXBbaV07XHJcbiAgICAgICAgdmFyIGluZGV4ID0gdW5Qcm9jZXNzZWROb2Rlcy5pbmRleE9mKHZhbHVlKTtcclxuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xyXG4gICAgICAgICAgdW5Qcm9jZXNzZWROb2Rlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICB2aXNpdGVkID0gbmV3IEhhc2hTZXQoKTtcclxuICAgICAgcGFyZW50cyA9IG5ldyBIYXNoTWFwKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gZmxhdEZvcmVzdDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGlzIG1ldGhvZCBjcmVhdGVzIGR1bW15IG5vZGVzIChhbiBsLWxldmVsIG5vZGUgd2l0aCBtaW5pbWFsIGRpbWVuc2lvbnMpXHJcbiAqIGZvciB0aGUgZ2l2ZW4gZWRnZSAob25lIHBlciBiZW5kcG9pbnQpLiBUaGUgZXhpc3RpbmcgbC1sZXZlbCBzdHJ1Y3R1cmVcclxuICogaXMgdXBkYXRlZCBhY2NvcmRpbmdseS5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuY3JlYXRlRHVtbXlOb2Rlc0ZvckJlbmRwb2ludHMgPSBmdW5jdGlvbiAoZWRnZSlcclxue1xyXG4gIHZhciBkdW1teU5vZGVzID0gW107XHJcbiAgdmFyIHByZXYgPSBlZGdlLnNvdXJjZTtcclxuXHJcbiAgdmFyIGdyYXBoID0gdGhpcy5ncmFwaE1hbmFnZXIuY2FsY0xvd2VzdENvbW1vbkFuY2VzdG9yKGVkZ2Uuc291cmNlLCBlZGdlLnRhcmdldCk7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZS5iZW5kcG9pbnRzLmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIC8vIGNyZWF0ZSBuZXcgZHVtbXkgbm9kZVxyXG4gICAgdmFyIGR1bW15Tm9kZSA9IHRoaXMubmV3Tm9kZShudWxsKTtcclxuICAgIGR1bW15Tm9kZS5zZXRSZWN0KG5ldyBQb2ludCgwLCAwKSwgbmV3IERpbWVuc2lvbigxLCAxKSk7XHJcblxyXG4gICAgZ3JhcGguYWRkKGR1bW15Tm9kZSk7XHJcblxyXG4gICAgLy8gY3JlYXRlIG5ldyBkdW1teSBlZGdlIGJldHdlZW4gcHJldiBhbmQgZHVtbXkgbm9kZVxyXG4gICAgdmFyIGR1bW15RWRnZSA9IHRoaXMubmV3RWRnZShudWxsKTtcclxuICAgIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChkdW1teUVkZ2UsIHByZXYsIGR1bW15Tm9kZSk7XHJcblxyXG4gICAgZHVtbXlOb2Rlcy5hZGQoZHVtbXlOb2RlKTtcclxuICAgIHByZXYgPSBkdW1teU5vZGU7XHJcbiAgfVxyXG5cclxuICB2YXIgZHVtbXlFZGdlID0gdGhpcy5uZXdFZGdlKG51bGwpO1xyXG4gIHRoaXMuZ3JhcGhNYW5hZ2VyLmFkZChkdW1teUVkZ2UsIHByZXYsIGVkZ2UudGFyZ2V0KTtcclxuXHJcbiAgdGhpcy5lZGdlVG9EdW1teU5vZGVzLnB1dChlZGdlLCBkdW1teU5vZGVzKTtcclxuXHJcbiAgLy8gcmVtb3ZlIHJlYWwgZWRnZSBmcm9tIGdyYXBoIG1hbmFnZXIgaWYgaXQgaXMgaW50ZXItZ3JhcGhcclxuICBpZiAoZWRnZS5pc0ludGVyR3JhcGgoKSlcclxuICB7XHJcbiAgICB0aGlzLmdyYXBoTWFuYWdlci5yZW1vdmUoZWRnZSk7XHJcbiAgfVxyXG4gIC8vIGVsc2UsIHJlbW92ZSB0aGUgZWRnZSBmcm9tIHRoZSBjdXJyZW50IGdyYXBoXHJcbiAgZWxzZVxyXG4gIHtcclxuICAgIGdyYXBoLnJlbW92ZShlZGdlKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBkdW1teU5vZGVzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGNyZWF0ZXMgYmVuZHBvaW50cyBmb3IgZWRnZXMgZnJvbSB0aGUgZHVtbXkgbm9kZXNcclxuICogYXQgbC1sZXZlbC5cclxuICovXHJcbkxheW91dC5wcm90b3R5cGUuY3JlYXRlQmVuZHBvaW50c0Zyb21EdW1teU5vZGVzID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHZhciBlZGdlcyA9IFtdO1xyXG4gIGVkZ2VzID0gZWRnZXMuY29uY2F0KHRoaXMuZ3JhcGhNYW5hZ2VyLmdldEFsbEVkZ2VzKCkpO1xyXG4gIGVkZ2VzID0gdGhpcy5lZGdlVG9EdW1teU5vZGVzLmtleVNldCgpLmNvbmNhdChlZGdlcyk7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZWRnZXMubGVuZ3RoOyBrKyspXHJcbiAge1xyXG4gICAgdmFyIGxFZGdlID0gZWRnZXNba107XHJcblxyXG4gICAgaWYgKGxFZGdlLmJlbmRwb2ludHMubGVuZ3RoID4gMClcclxuICAgIHtcclxuICAgICAgdmFyIHBhdGggPSB0aGlzLmVkZ2VUb0R1bW15Tm9kZXMuZ2V0KGxFZGdlKTtcclxuXHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKylcclxuICAgICAge1xyXG4gICAgICAgIHZhciBkdW1teU5vZGUgPSBwYXRoW2ldO1xyXG4gICAgICAgIHZhciBwID0gbmV3IFBvaW50RChkdW1teU5vZGUuZ2V0Q2VudGVyWCgpLFxyXG4gICAgICAgICAgICAgICAgZHVtbXlOb2RlLmdldENlbnRlclkoKSk7XHJcblxyXG4gICAgICAgIC8vIHVwZGF0ZSBiZW5kcG9pbnQncyBsb2NhdGlvbiBhY2NvcmRpbmcgdG8gZHVtbXkgbm9kZVxyXG4gICAgICAgIHZhciBlYnAgPSBsRWRnZS5iZW5kcG9pbnRzLmdldChpKTtcclxuICAgICAgICBlYnAueCA9IHAueDtcclxuICAgICAgICBlYnAueSA9IHAueTtcclxuXHJcbiAgICAgICAgLy8gcmVtb3ZlIHRoZSBkdW1teSBub2RlLCBkdW1teSBlZGdlcyBpbmNpZGVudCB3aXRoIHRoaXNcclxuICAgICAgICAvLyBkdW1teSBub2RlIGlzIGFsc28gcmVtb3ZlZCAod2l0aGluIHRoZSByZW1vdmUgbWV0aG9kKVxyXG4gICAgICAgIGR1bW15Tm9kZS5nZXRPd25lcigpLnJlbW92ZShkdW1teU5vZGUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBhZGQgdGhlIHJlYWwgZWRnZSB0byBncmFwaFxyXG4gICAgICB0aGlzLmdyYXBoTWFuYWdlci5hZGQobEVkZ2UsIGxFZGdlLnNvdXJjZSwgbEVkZ2UudGFyZ2V0KTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5MYXlvdXQudHJhbnNmb3JtID0gZnVuY3Rpb24gKHNsaWRlclZhbHVlLCBkZWZhdWx0VmFsdWUsIG1pbkRpdiwgbWF4TXVsKSB7XHJcbiAgaWYgKG1pbkRpdiAhPSB1bmRlZmluZWQgJiYgbWF4TXVsICE9IHVuZGVmaW5lZCkge1xyXG4gICAgdmFyIHZhbHVlID0gZGVmYXVsdFZhbHVlO1xyXG5cclxuICAgIGlmIChzbGlkZXJWYWx1ZSA8PSA1MClcclxuICAgIHtcclxuICAgICAgdmFyIG1pblZhbHVlID0gZGVmYXVsdFZhbHVlIC8gbWluRGl2O1xyXG4gICAgICB2YWx1ZSAtPSAoKGRlZmF1bHRWYWx1ZSAtIG1pblZhbHVlKSAvIDUwKSAqICg1MCAtIHNsaWRlclZhbHVlKTtcclxuICAgIH1cclxuICAgIGVsc2VcclxuICAgIHtcclxuICAgICAgdmFyIG1heFZhbHVlID0gZGVmYXVsdFZhbHVlICogbWF4TXVsO1xyXG4gICAgICB2YWx1ZSArPSAoKG1heFZhbHVlIC0gZGVmYXVsdFZhbHVlKSAvIDUwKSAqIChzbGlkZXJWYWx1ZSAtIDUwKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG4gICAgdmFyIGEsIGI7XHJcblxyXG4gICAgaWYgKHNsaWRlclZhbHVlIDw9IDUwKVxyXG4gICAge1xyXG4gICAgICBhID0gOS4wICogZGVmYXVsdFZhbHVlIC8gNTAwLjA7XHJcbiAgICAgIGIgPSBkZWZhdWx0VmFsdWUgLyAxMC4wO1xyXG4gICAgfVxyXG4gICAgZWxzZVxyXG4gICAge1xyXG4gICAgICBhID0gOS4wICogZGVmYXVsdFZhbHVlIC8gNTAuMDtcclxuICAgICAgYiA9IC04ICogZGVmYXVsdFZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAoYSAqIHNsaWRlclZhbHVlICsgYik7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoaXMgbWV0aG9kIGZpbmRzIGFuZCByZXR1cm5zIHRoZSBjZW50ZXIgb2YgdGhlIGdpdmVuIG5vZGVzLCBhc3N1bWluZ1xyXG4gKiB0aGF0IHRoZSBnaXZlbiBub2RlcyBmb3JtIGEgdHJlZSBpbiB0aGVtc2VsdmVzLlxyXG4gKi9cclxuTGF5b3V0LmZpbmRDZW50ZXJPZlRyZWUgPSBmdW5jdGlvbiAobm9kZXMpXHJcbntcclxuICB2YXIgbGlzdCA9IFtdO1xyXG4gIGxpc3QgPSBsaXN0LmNvbmNhdChub2Rlcyk7XHJcblxyXG4gIHZhciByZW1vdmVkTm9kZXMgPSBbXTtcclxuICB2YXIgcmVtYWluaW5nRGVncmVlcyA9IG5ldyBIYXNoTWFwKCk7XHJcbiAgdmFyIGZvdW5kQ2VudGVyID0gZmFsc2U7XHJcbiAgdmFyIGNlbnRlck5vZGUgPSBudWxsO1xyXG5cclxuICBpZiAobGlzdC5sZW5ndGggPT0gMSB8fCBsaXN0Lmxlbmd0aCA9PSAyKVxyXG4gIHtcclxuICAgIGZvdW5kQ2VudGVyID0gdHJ1ZTtcclxuICAgIGNlbnRlck5vZGUgPSBsaXN0WzBdO1xyXG4gIH1cclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKVxyXG4gIHtcclxuICAgIHZhciBub2RlID0gbGlzdFtpXTtcclxuICAgIHZhciBkZWdyZWUgPSBub2RlLmdldE5laWdoYm9yc0xpc3QoKS5zaXplKCk7XHJcbiAgICByZW1haW5pbmdEZWdyZWVzLnB1dChub2RlLCBub2RlLmdldE5laWdoYm9yc0xpc3QoKS5zaXplKCkpO1xyXG5cclxuICAgIGlmIChkZWdyZWUgPT0gMSlcclxuICAgIHtcclxuICAgICAgcmVtb3ZlZE5vZGVzLnB1c2gobm9kZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YXIgdGVtcExpc3QgPSBbXTtcclxuICB0ZW1wTGlzdCA9IHRlbXBMaXN0LmNvbmNhdChyZW1vdmVkTm9kZXMpO1xyXG5cclxuICB3aGlsZSAoIWZvdW5kQ2VudGVyKVxyXG4gIHtcclxuICAgIHZhciB0ZW1wTGlzdDIgPSBbXTtcclxuICAgIHRlbXBMaXN0MiA9IHRlbXBMaXN0Mi5jb25jYXQodGVtcExpc3QpO1xyXG4gICAgdGVtcExpc3QgPSBbXTtcclxuXHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspXHJcbiAgICB7XHJcbiAgICAgIHZhciBub2RlID0gbGlzdFtpXTtcclxuXHJcbiAgICAgIHZhciBpbmRleCA9IGxpc3QuaW5kZXhPZihub2RlKTtcclxuICAgICAgaWYgKGluZGV4ID49IDApIHtcclxuICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciBuZWlnaGJvdXJzID0gbm9kZS5nZXROZWlnaGJvcnNMaXN0KCk7XHJcblxyXG4gICAgICBPYmplY3Qua2V5cyhuZWlnaGJvdXJzLnNldCkuZm9yRWFjaChmdW5jdGlvbihqKSB7XHJcbiAgICAgICAgdmFyIG5laWdoYm91ciA9IG5laWdoYm91cnMuc2V0W2pdO1xyXG4gICAgICAgIGlmIChyZW1vdmVkTm9kZXMuaW5kZXhPZihuZWlnaGJvdXIpIDwgMClcclxuICAgICAgICB7XHJcbiAgICAgICAgICB2YXIgb3RoZXJEZWdyZWUgPSByZW1haW5pbmdEZWdyZWVzLmdldChuZWlnaGJvdXIpO1xyXG4gICAgICAgICAgdmFyIG5ld0RlZ3JlZSA9IG90aGVyRGVncmVlIC0gMTtcclxuXHJcbiAgICAgICAgICBpZiAobmV3RGVncmVlID09IDEpXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHRlbXBMaXN0LnB1c2gobmVpZ2hib3VyKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICByZW1haW5pbmdEZWdyZWVzLnB1dChuZWlnaGJvdXIsIG5ld0RlZ3JlZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZW1vdmVkTm9kZXMgPSByZW1vdmVkTm9kZXMuY29uY2F0KHRlbXBMaXN0KTtcclxuXHJcbiAgICBpZiAobGlzdC5sZW5ndGggPT0gMSB8fCBsaXN0Lmxlbmd0aCA9PSAyKVxyXG4gICAge1xyXG4gICAgICBmb3VuZENlbnRlciA9IHRydWU7XHJcbiAgICAgIGNlbnRlck5vZGUgPSBsaXN0WzBdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGNlbnRlck5vZGU7XHJcbn07XHJcblxyXG4vKipcclxuICogRHVyaW5nIHRoZSBjb2Fyc2VuaW5nIHByb2Nlc3MsIHRoaXMgbGF5b3V0IG1heSBiZSByZWZlcmVuY2VkIGJ5IHR3byBncmFwaCBtYW5hZ2Vyc1xyXG4gKiB0aGlzIHNldHRlciBmdW5jdGlvbiBncmFudHMgYWNjZXNzIHRvIGNoYW5nZSB0aGUgY3VycmVudGx5IGJlaW5nIHVzZWQgZ3JhcGggbWFuYWdlclxyXG4gKi9cclxuTGF5b3V0LnByb3RvdHlwZS5zZXRHcmFwaE1hbmFnZXIgPSBmdW5jdGlvbiAoZ20pXHJcbntcclxuICB0aGlzLmdyYXBoTWFuYWdlciA9IGdtO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXQ7XHJcbiIsImZ1bmN0aW9uIExheW91dENvbnN0YW50cygpIHtcclxufVxyXG5cclxuLyoqXHJcbiAqIExheW91dCBRdWFsaXR5XHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuUFJPT0ZfUVVBTElUWSA9IDA7XHJcbkxheW91dENvbnN0YW50cy5ERUZBVUxUX1FVQUxJVFkgPSAxO1xyXG5MYXlvdXRDb25zdGFudHMuRFJBRlRfUVVBTElUWSA9IDI7XHJcblxyXG4vKipcclxuICogRGVmYXVsdCBwYXJhbWV0ZXJzXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9DUkVBVEVfQkVORFNfQVNfTkVFREVEID0gZmFsc2U7XHJcbi8vTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfSU5DUkVNRU5UQUwgPSB0cnVlO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IGZhbHNlO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9BTklNQVRJT05fT05fTEFZT1VUID0gdHJ1ZTtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX0RVUklOR19MQVlPVVQgPSBmYWxzZTtcclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfQU5JTUFUSU9OX1BFUklPRCA9IDUwO1xyXG5MYXlvdXRDb25zdGFudHMuREVGQVVMVF9VTklGT1JNX0xFQUZfTk9ERV9TSVpFUyA9IGZhbHNlO1xyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gU2VjdGlvbjogR2VuZXJhbCBvdGhlciBjb25zdGFudHNcclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLypcclxuICogTWFyZ2lucyBvZiBhIGdyYXBoIHRvIGJlIGFwcGxpZWQgb24gYm91ZGluZyByZWN0YW5nbGUgb2YgaXRzIGNvbnRlbnRzLiBXZVxyXG4gKiBhc3N1bWUgbWFyZ2lucyBvbiBhbGwgZm91ciBzaWRlcyB0byBiZSB1bmlmb3JtLlxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBUEhfTUFSR0lOID0gMTU7XHJcblxyXG4vKlxyXG4gKiBEZWZhdWx0IGRpbWVuc2lvbiBvZiBhIG5vbi1jb21wb3VuZCBub2RlLlxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkUgPSA0MDtcclxuXHJcbi8qXHJcbiAqIERlZmF1bHQgZGltZW5zaW9uIG9mIGEgbm9uLWNvbXBvdW5kIG5vZGUuXHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuU0lNUExFX05PREVfSEFMRl9TSVpFID0gTGF5b3V0Q29uc3RhbnRzLlNJTVBMRV9OT0RFX1NJWkUgLyAyO1xyXG5cclxuLypcclxuICogRW1wdHkgY29tcG91bmQgbm9kZSBzaXplLiBXaGVuIGEgY29tcG91bmQgbm9kZSBpcyBlbXB0eSwgaXRzIGJvdGhcclxuICogZGltZW5zaW9ucyBzaG91bGQgYmUgb2YgdGhpcyB2YWx1ZS5cclxuICovXHJcbkxheW91dENvbnN0YW50cy5FTVBUWV9DT01QT1VORF9OT0RFX1NJWkUgPSA0MDtcclxuXHJcbi8qXHJcbiAqIE1pbmltdW0gbGVuZ3RoIHRoYXQgYW4gZWRnZSBzaG91bGQgdGFrZSBkdXJpbmcgbGF5b3V0XHJcbiAqL1xyXG5MYXlvdXRDb25zdGFudHMuTUlOX0VER0VfTEVOR1RIID0gMTtcclxuXHJcbi8qXHJcbiAqIFdvcmxkIGJvdW5kYXJpZXMgdGhhdCBsYXlvdXQgb3BlcmF0ZXMgb25cclxuICovXHJcbkxheW91dENvbnN0YW50cy5XT1JMRF9CT1VOREFSWSA9IDEwMDAwMDA7XHJcblxyXG4vKlxyXG4gKiBXb3JsZCBib3VuZGFyaWVzIHRoYXQgcmFuZG9tIHBvc2l0aW9uaW5nIGNhbiBiZSBwZXJmb3JtZWQgd2l0aFxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLklOSVRJQUxfV09STERfQk9VTkRBUlkgPSBMYXlvdXRDb25zdGFudHMuV09STERfQk9VTkRBUlkgLyAxMDAwO1xyXG5cclxuLypcclxuICogQ29vcmRpbmF0ZXMgb2YgdGhlIHdvcmxkIGNlbnRlclxyXG4gKi9cclxuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9YID0gMTIwMDtcclxuTGF5b3V0Q29uc3RhbnRzLldPUkxEX0NFTlRFUl9ZID0gOTAwO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBMYXlvdXRDb25zdGFudHM7XHJcbiIsIi8qXHJcbiAqVGhpcyBjbGFzcyBpcyB0aGUgamF2YXNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgUG9pbnQuamF2YSBjbGFzcyBpbiBqZGtcclxuICovXHJcbmZ1bmN0aW9uIFBvaW50KHgsIHksIHApIHtcclxuICB0aGlzLnggPSBudWxsO1xyXG4gIHRoaXMueSA9IG51bGw7XHJcbiAgaWYgKHggPT0gbnVsbCAmJiB5ID09IG51bGwgJiYgcCA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSAwO1xyXG4gICAgdGhpcy55ID0gMDtcclxuICB9XHJcbiAgZWxzZSBpZiAodHlwZW9mIHggPT0gJ251bWJlcicgJiYgdHlwZW9mIHkgPT0gJ251bWJlcicgJiYgcCA9PSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSB4O1xyXG4gICAgdGhpcy55ID0geTtcclxuICB9XHJcbiAgZWxzZSBpZiAoeC5jb25zdHJ1Y3Rvci5uYW1lID09ICdQb2ludCcgJiYgeSA9PSBudWxsICYmIHAgPT0gbnVsbCkge1xyXG4gICAgcCA9IHg7XHJcbiAgICB0aGlzLnggPSBwLng7XHJcbiAgICB0aGlzLnkgPSBwLnk7XHJcbiAgfVxyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy54O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZ2V0WSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy55O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIG5ldyBQb2ludCh0aGlzLngsIHRoaXMueSk7XHJcbn1cclxuXHJcblBvaW50LnByb3RvdHlwZS5zZXRMb2NhdGlvbiA9IGZ1bmN0aW9uICh4LCB5LCBwKSB7XHJcbiAgaWYgKHguY29uc3RydWN0b3IubmFtZSA9PSAnUG9pbnQnICYmIHkgPT0gbnVsbCAmJiBwID09IG51bGwpIHtcclxuICAgIHAgPSB4O1xyXG4gICAgdGhpcy5zZXRMb2NhdGlvbihwLngsIHAueSk7XHJcbiAgfVxyXG4gIGVsc2UgaWYgKHR5cGVvZiB4ID09ICdudW1iZXInICYmIHR5cGVvZiB5ID09ICdudW1iZXInICYmIHAgPT0gbnVsbCkge1xyXG4gICAgLy9pZiBib3RoIHBhcmFtZXRlcnMgYXJlIGludGVnZXIganVzdCBtb3ZlICh4LHkpIGxvY2F0aW9uXHJcbiAgICBpZiAocGFyc2VJbnQoeCkgPT0geCAmJiBwYXJzZUludCh5KSA9PSB5KSB7XHJcbiAgICAgIHRoaXMubW92ZSh4LCB5KTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGlzLnggPSBNYXRoLmZsb29yKHggKyAwLjUpO1xyXG4gICAgICB0aGlzLnkgPSBNYXRoLmZsb29yKHkgKyAwLjUpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbiAoeCwgeSkge1xyXG4gIHRoaXMueCA9IHg7XHJcbiAgdGhpcy55ID0geTtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcclxuICB0aGlzLnggKz0gZHg7XHJcbiAgdGhpcy55ICs9IGR5O1xyXG59XHJcblxyXG5Qb2ludC5wcm90b3R5cGUuZXF1YWxzID0gZnVuY3Rpb24gKG9iaikge1xyXG4gIGlmIChvYmouY29uc3RydWN0b3IubmFtZSA9PSBcIlBvaW50XCIpIHtcclxuICAgIHZhciBwdCA9IG9iajtcclxuICAgIHJldHVybiAodGhpcy54ID09IHB0LngpICYmICh0aGlzLnkgPT0gcHQueSk7XHJcbiAgfVxyXG4gIHJldHVybiB0aGlzID09IG9iajtcclxufVxyXG5cclxuUG9pbnQucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBuZXcgUG9pbnQoKS5jb25zdHJ1Y3Rvci5uYW1lICsgXCJbeD1cIiArIHRoaXMueCArIFwiLHk9XCIgKyB0aGlzLnkgKyBcIl1cIjtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludDtcclxuIiwiZnVuY3Rpb24gUG9pbnREKHgsIHkpIHtcclxuICBpZiAoeCA9PSBudWxsICYmIHkgPT0gbnVsbCkge1xyXG4gICAgdGhpcy54ID0gMDtcclxuICAgIHRoaXMueSA9IDA7XHJcbiAgfSBlbHNlIHtcclxuICAgIHRoaXMueCA9IHg7XHJcbiAgICB0aGlzLnkgPSB5O1xyXG4gIH1cclxufVxyXG5cclxuUG9pbnRELnByb3RvdHlwZS5nZXRYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLng7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuc2V0WCA9IGZ1bmN0aW9uICh4KVxyXG57XHJcbiAgdGhpcy54ID0geDtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuc2V0WSA9IGZ1bmN0aW9uICh5KVxyXG57XHJcbiAgdGhpcy55ID0geTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuZ2V0RGlmZmVyZW5jZSA9IGZ1bmN0aW9uIChwdClcclxue1xyXG4gIHJldHVybiBuZXcgRGltZW5zaW9uRCh0aGlzLnggLSBwdC54LCB0aGlzLnkgLSBwdC55KTtcclxufTtcclxuXHJcblBvaW50RC5wcm90b3R5cGUuZ2V0Q29weSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gbmV3IFBvaW50RCh0aGlzLngsIHRoaXMueSk7XHJcbn07XHJcblxyXG5Qb2ludEQucHJvdG90eXBlLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkaW0pXHJcbntcclxuICB0aGlzLnggKz0gZGltLndpZHRoO1xyXG4gIHRoaXMueSArPSBkaW0uaGVpZ2h0O1xyXG4gIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBQb2ludEQ7XHJcbiIsImZ1bmN0aW9uIFJhbmRvbVNlZWQoKSB7XHJcbn1cclxuUmFuZG9tU2VlZC5zZWVkID0gMTtcclxuUmFuZG9tU2VlZC54ID0gMDtcclxuXHJcblJhbmRvbVNlZWQubmV4dERvdWJsZSA9IGZ1bmN0aW9uICgpIHtcclxuICBSYW5kb21TZWVkLnggPSBNYXRoLnNpbihSYW5kb21TZWVkLnNlZWQrKykgKiAxMDAwMDtcclxuICByZXR1cm4gUmFuZG9tU2VlZC54IC0gTWF0aC5mbG9vcihSYW5kb21TZWVkLngpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSYW5kb21TZWVkO1xyXG4iLCJmdW5jdGlvbiBSZWN0YW5nbGVEKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcclxuICB0aGlzLnggPSAwO1xyXG4gIHRoaXMueSA9IDA7XHJcbiAgdGhpcy53aWR0aCA9IDA7XHJcbiAgdGhpcy5oZWlnaHQgPSAwO1xyXG5cclxuICBpZiAoeCAhPSBudWxsICYmIHkgIT0gbnVsbCAmJiB3aWR0aCAhPSBudWxsICYmIGhlaWdodCAhPSBudWxsKSB7XHJcbiAgICB0aGlzLnggPSB4O1xyXG4gICAgdGhpcy55ID0geTtcclxuICAgIHRoaXMud2lkdGggPSB3aWR0aDtcclxuICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0O1xyXG4gIH1cclxufVxyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0WCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy54O1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuc2V0WCA9IGZ1bmN0aW9uICh4KVxyXG57XHJcbiAgdGhpcy54ID0geDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldFkgPSBmdW5jdGlvbiAoeSlcclxue1xyXG4gIHRoaXMueSA9IHk7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRXaWR0aCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy53aWR0aDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldFdpZHRoID0gZnVuY3Rpb24gKHdpZHRoKVxyXG57XHJcbiAgdGhpcy53aWR0aCA9IHdpZHRoO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0SGVpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLnNldEhlaWdodCA9IGZ1bmN0aW9uIChoZWlnaHQpXHJcbntcclxuICB0aGlzLmhlaWdodCA9IGhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldFJpZ2h0ID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnggKyB0aGlzLndpZHRoO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0Qm90dG9tID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodDtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmludGVyc2VjdHMgPSBmdW5jdGlvbiAoYSlcclxue1xyXG4gIGlmICh0aGlzLmdldFJpZ2h0KCkgPCBhLngpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHRoaXMuZ2V0Qm90dG9tKCkgPCBhLnkpXHJcbiAge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgaWYgKGEuZ2V0UmlnaHQoKSA8IHRoaXMueClcclxuICB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAoYS5nZXRCb3R0b20oKSA8IHRoaXMueSlcclxuICB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldENlbnRlclggPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMueCArIHRoaXMud2lkdGggLyAyO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0TWluWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5nZXRYKCk7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNYXhYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdldFgoKSArIHRoaXMud2lkdGg7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRDZW50ZXJZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLnkgKyB0aGlzLmhlaWdodCAvIDI7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRNaW5ZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmdldFkoKTtcclxufTtcclxuXHJcblJlY3RhbmdsZUQucHJvdG90eXBlLmdldE1heFkgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMuZ2V0WSgpICsgdGhpcy5oZWlnaHQ7XHJcbn07XHJcblxyXG5SZWN0YW5nbGVELnByb3RvdHlwZS5nZXRXaWR0aEhhbGYgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMud2lkdGggLyAyO1xyXG59O1xyXG5cclxuUmVjdGFuZ2xlRC5wcm90b3R5cGUuZ2V0SGVpZ2h0SGFsZiA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5oZWlnaHQgLyAyO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBSZWN0YW5nbGVEO1xyXG4iLCJ2YXIgUG9pbnREID0gcmVxdWlyZSgnLi9Qb2ludEQnKTtcclxuXHJcbmZ1bmN0aW9uIFRyYW5zZm9ybSh4LCB5KSB7XHJcbiAgdGhpcy5sd29ybGRPcmdYID0gMC4wO1xyXG4gIHRoaXMubHdvcmxkT3JnWSA9IDAuMDtcclxuICB0aGlzLmxkZXZpY2VPcmdYID0gMC4wO1xyXG4gIHRoaXMubGRldmljZU9yZ1kgPSAwLjA7XHJcbiAgdGhpcy5sd29ybGRFeHRYID0gMS4wO1xyXG4gIHRoaXMubHdvcmxkRXh0WSA9IDEuMDtcclxuICB0aGlzLmxkZXZpY2VFeHRYID0gMS4wO1xyXG4gIHRoaXMubGRldmljZUV4dFkgPSAxLjA7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRPcmdYID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmx3b3JsZE9yZ1g7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRPcmdYID0gZnVuY3Rpb24gKHdveClcclxue1xyXG4gIHRoaXMubHdvcmxkT3JnWCA9IHdveDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5nZXRXb3JsZE9yZ1kgPSBmdW5jdGlvbiAoKVxyXG57XHJcbiAgcmV0dXJuIHRoaXMubHdvcmxkT3JnWTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXRXb3JsZE9yZ1kgPSBmdW5jdGlvbiAod295KVxyXG57XHJcbiAgdGhpcy5sd29ybGRPcmdZID0gd295O1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmdldFdvcmxkRXh0WCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sd29ybGRFeHRYO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnNldFdvcmxkRXh0WCA9IGZ1bmN0aW9uICh3ZXgpXHJcbntcclxuICB0aGlzLmx3b3JsZEV4dFggPSB3ZXg7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0V29ybGRFeHRZID0gZnVuY3Rpb24gKClcclxue1xyXG4gIHJldHVybiB0aGlzLmx3b3JsZEV4dFk7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuc2V0V29ybGRFeHRZID0gZnVuY3Rpb24gKHdleSlcclxue1xyXG4gIHRoaXMubHdvcmxkRXh0WSA9IHdleTtcclxufVxyXG5cclxuLyogRGV2aWNlIHJlbGF0ZWQgKi9cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlT3JnWCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sZGV2aWNlT3JnWDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VPcmdYID0gZnVuY3Rpb24gKGRveClcclxue1xyXG4gIHRoaXMubGRldmljZU9yZ1ggPSBkb3g7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlT3JnWSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sZGV2aWNlT3JnWTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VPcmdZID0gZnVuY3Rpb24gKGRveSlcclxue1xyXG4gIHRoaXMubGRldmljZU9yZ1kgPSBkb3k7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlRXh0WCA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sZGV2aWNlRXh0WDtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VFeHRYID0gZnVuY3Rpb24gKGRleClcclxue1xyXG4gIHRoaXMubGRldmljZUV4dFggPSBkZXg7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuZ2V0RGV2aWNlRXh0WSA9IGZ1bmN0aW9uICgpXHJcbntcclxuICByZXR1cm4gdGhpcy5sZGV2aWNlRXh0WTtcclxufVxyXG5cclxuVHJhbnNmb3JtLnByb3RvdHlwZS5zZXREZXZpY2VFeHRZID0gZnVuY3Rpb24gKGRleSlcclxue1xyXG4gIHRoaXMubGRldmljZUV4dFkgPSBkZXk7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUudHJhbnNmb3JtWCA9IGZ1bmN0aW9uICh4KVxyXG57XHJcbiAgdmFyIHhEZXZpY2UgPSAwLjA7XHJcbiAgdmFyIHdvcmxkRXh0WCA9IHRoaXMubHdvcmxkRXh0WDtcclxuICBpZiAod29ybGRFeHRYICE9IDAuMClcclxuICB7XHJcbiAgICB4RGV2aWNlID0gdGhpcy5sZGV2aWNlT3JnWCArXHJcbiAgICAgICAgICAgICgoeCAtIHRoaXMubHdvcmxkT3JnWCkgKiB0aGlzLmxkZXZpY2VFeHRYIC8gd29ybGRFeHRYKTtcclxuICB9XHJcblxyXG4gIHJldHVybiB4RGV2aWNlO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLnRyYW5zZm9ybVkgPSBmdW5jdGlvbiAoeSlcclxue1xyXG4gIHZhciB5RGV2aWNlID0gMC4wO1xyXG4gIHZhciB3b3JsZEV4dFkgPSB0aGlzLmx3b3JsZEV4dFk7XHJcbiAgaWYgKHdvcmxkRXh0WSAhPSAwLjApXHJcbiAge1xyXG4gICAgeURldmljZSA9IHRoaXMubGRldmljZU9yZ1kgK1xyXG4gICAgICAgICAgICAoKHkgLSB0aGlzLmx3b3JsZE9yZ1kpICogdGhpcy5sZGV2aWNlRXh0WSAvIHdvcmxkRXh0WSk7XHJcbiAgfVxyXG5cclxuXHJcbiAgcmV0dXJuIHlEZXZpY2U7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuaW52ZXJzZVRyYW5zZm9ybVggPSBmdW5jdGlvbiAoeClcclxue1xyXG4gIHZhciB4V29ybGQgPSAwLjA7XHJcbiAgdmFyIGRldmljZUV4dFggPSB0aGlzLmxkZXZpY2VFeHRYO1xyXG4gIGlmIChkZXZpY2VFeHRYICE9IDAuMClcclxuICB7XHJcbiAgICB4V29ybGQgPSB0aGlzLmx3b3JsZE9yZ1ggK1xyXG4gICAgICAgICAgICAoKHggLSB0aGlzLmxkZXZpY2VPcmdYKSAqIHRoaXMubHdvcmxkRXh0WCAvIGRldmljZUV4dFgpO1xyXG4gIH1cclxuXHJcblxyXG4gIHJldHVybiB4V29ybGQ7XHJcbn1cclxuXHJcblRyYW5zZm9ybS5wcm90b3R5cGUuaW52ZXJzZVRyYW5zZm9ybVkgPSBmdW5jdGlvbiAoeSlcclxue1xyXG4gIHZhciB5V29ybGQgPSAwLjA7XHJcbiAgdmFyIGRldmljZUV4dFkgPSB0aGlzLmxkZXZpY2VFeHRZO1xyXG4gIGlmIChkZXZpY2VFeHRZICE9IDAuMClcclxuICB7XHJcbiAgICB5V29ybGQgPSB0aGlzLmx3b3JsZE9yZ1kgK1xyXG4gICAgICAgICAgICAoKHkgLSB0aGlzLmxkZXZpY2VPcmdZKSAqIHRoaXMubHdvcmxkRXh0WSAvIGRldmljZUV4dFkpO1xyXG4gIH1cclxuICByZXR1cm4geVdvcmxkO1xyXG59XHJcblxyXG5UcmFuc2Zvcm0ucHJvdG90eXBlLmludmVyc2VUcmFuc2Zvcm1Qb2ludCA9IGZ1bmN0aW9uIChpblBvaW50KVxyXG57XHJcbiAgdmFyIG91dFBvaW50ID1cclxuICAgICAgICAgIG5ldyBQb2ludEQodGhpcy5pbnZlcnNlVHJhbnNmb3JtWChpblBvaW50LngpLFxyXG4gICAgICAgICAgICAgICAgICB0aGlzLmludmVyc2VUcmFuc2Zvcm1ZKGluUG9pbnQueSkpO1xyXG4gIHJldHVybiBvdXRQb2ludDtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBUcmFuc2Zvcm07XHJcbiIsImZ1bmN0aW9uIFVuaXF1ZUlER2VuZXJldG9yKCkge1xyXG59XHJcblxyXG5VbmlxdWVJREdlbmVyZXRvci5sYXN0SUQgPSAwO1xyXG5cclxuVW5pcXVlSURHZW5lcmV0b3IuY3JlYXRlSUQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgaWYgKFVuaXF1ZUlER2VuZXJldG9yLmlzUHJpbWl0aXZlKG9iaikpIHtcclxuICAgIHJldHVybiBvYmo7XHJcbiAgfVxyXG4gIGlmIChvYmoudW5pcXVlSUQgIT0gbnVsbCkge1xyXG4gICAgcmV0dXJuIG9iai51bmlxdWVJRDtcclxuICB9XHJcbiAgb2JqLnVuaXF1ZUlEID0gVW5pcXVlSURHZW5lcmV0b3IuZ2V0U3RyaW5nKCk7XHJcbiAgVW5pcXVlSURHZW5lcmV0b3IubGFzdElEKys7XHJcbiAgcmV0dXJuIG9iai51bmlxdWVJRDtcclxufVxyXG5cclxuVW5pcXVlSURHZW5lcmV0b3IuZ2V0U3RyaW5nID0gZnVuY3Rpb24gKGlkKSB7XHJcbiAgaWYgKGlkID09IG51bGwpXHJcbiAgICBpZCA9IFVuaXF1ZUlER2VuZXJldG9yLmxhc3RJRDtcclxuICByZXR1cm4gXCJPYmplY3QjXCIgKyBpZCArIFwiXCI7XHJcbn1cclxuXHJcblVuaXF1ZUlER2VuZXJldG9yLmlzUHJpbWl0aXZlID0gZnVuY3Rpb24gKGFyZykge1xyXG4gIHZhciB0eXBlID0gdHlwZW9mIGFyZztcclxuICByZXR1cm4gYXJnID09IG51bGwgfHwgKHR5cGUgIT0gXCJvYmplY3RcIiAmJiB0eXBlICE9IFwiZnVuY3Rpb25cIik7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVW5pcXVlSURHZW5lcmV0b3I7XHJcbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBEaW1lbnNpb25EID0gcmVxdWlyZSgnLi9EaW1lbnNpb25EJyk7XHJcbnZhciBIYXNoTWFwID0gcmVxdWlyZSgnLi9IYXNoTWFwJyk7XHJcbnZhciBIYXNoU2V0ID0gcmVxdWlyZSgnLi9IYXNoU2V0Jyk7XHJcbnZhciBJR2VvbWV0cnkgPSByZXF1aXJlKCcuL0lHZW9tZXRyeScpO1xyXG52YXIgSU1hdGggPSByZXF1aXJlKCcuL0lNYXRoJyk7XHJcbnZhciBJbnRlZ2VyID0gcmVxdWlyZSgnLi9JbnRlZ2VyJyk7XHJcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vUG9pbnQnKTtcclxudmFyIFBvaW50RCA9IHJlcXVpcmUoJy4vUG9pbnREJyk7XHJcbnZhciBSYW5kb21TZWVkID0gcmVxdWlyZSgnLi9SYW5kb21TZWVkJyk7XHJcbnZhciBSZWN0YW5nbGVEID0gcmVxdWlyZSgnLi9SZWN0YW5nbGVEJyk7XHJcbnZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpO1xyXG52YXIgVW5pcXVlSURHZW5lcmV0b3IgPSByZXF1aXJlKCcuL1VuaXF1ZUlER2VuZXJldG9yJyk7XHJcbnZhciBMR3JhcGhPYmplY3QgPSByZXF1aXJlKCcuL0xHcmFwaE9iamVjdCcpO1xyXG52YXIgTEdyYXBoID0gcmVxdWlyZSgnLi9MR3JhcGgnKTtcclxudmFyIExFZGdlID0gcmVxdWlyZSgnLi9MRWRnZScpO1xyXG52YXIgTEdyYXBoTWFuYWdlciA9IHJlcXVpcmUoJy4vTEdyYXBoTWFuYWdlcicpO1xyXG52YXIgTE5vZGUgPSByZXF1aXJlKCcuL0xOb2RlJyk7XHJcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xyXG52YXIgTGF5b3V0Q29uc3RhbnRzID0gcmVxdWlyZSgnLi9MYXlvdXRDb25zdGFudHMnKTtcclxudmFyIEZETGF5b3V0ID0gcmVxdWlyZSgnLi9GRExheW91dCcpO1xyXG52YXIgRkRMYXlvdXRDb25zdGFudHMgPSByZXF1aXJlKCcuL0ZETGF5b3V0Q29uc3RhbnRzJyk7XHJcbnZhciBGRExheW91dEVkZ2UgPSByZXF1aXJlKCcuL0ZETGF5b3V0RWRnZScpO1xyXG52YXIgRkRMYXlvdXROb2RlID0gcmVxdWlyZSgnLi9GRExheW91dE5vZGUnKTtcclxudmFyIENvU0VDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvU0VDb25zdGFudHMnKTtcclxudmFyIENvU0VFZGdlID0gcmVxdWlyZSgnLi9Db1NFRWRnZScpO1xyXG52YXIgQ29TRUdyYXBoID0gcmVxdWlyZSgnLi9Db1NFR3JhcGgnKTtcclxudmFyIENvU0VHcmFwaE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvU0VHcmFwaE1hbmFnZXInKTtcclxudmFyIENvU0VMYXlvdXQgPSByZXF1aXJlKCcuL0NvU0VMYXlvdXQnKTtcclxudmFyIENvU0VOb2RlID0gcmVxdWlyZSgnLi9Db1NFTm9kZScpO1xyXG5cclxudmFyIGRlZmF1bHRzID0ge1xyXG4gIC8vIENhbGxlZCBvbiBgbGF5b3V0cmVhZHlgXHJcbiAgcmVhZHk6IGZ1bmN0aW9uICgpIHtcclxuICB9LFxyXG4gIC8vIENhbGxlZCBvbiBgbGF5b3V0c3RvcGBcclxuICBzdG9wOiBmdW5jdGlvbiAoKSB7XHJcbiAgfSxcclxuICAvLyBudW1iZXIgb2YgdGlja3MgcGVyIGZyYW1lOyBoaWdoZXIgaXMgZmFzdGVyIGJ1dCBtb3JlIGplcmt5XHJcbiAgcmVmcmVzaDogMzAsXHJcbiAgLy8gV2hldGhlciB0byBmaXQgdGhlIG5ldHdvcmsgdmlldyBhZnRlciB3aGVuIGRvbmVcclxuICBmaXQ6IHRydWUsXHJcbiAgLy8gUGFkZGluZyBvbiBmaXRcclxuICBwYWRkaW5nOiAxMCxcclxuICAvLyBQYWRkaW5nIGZvciBjb21wb3VuZHNcclxuICBwYWRkaW5nQ29tcG91bmQ6IDE1LFxyXG4gIC8vIFdoZXRoZXIgdG8gZW5hYmxlIGluY3JlbWVudGFsIG1vZGVcclxuICByYW5kb21pemU6IHRydWUsXHJcbiAgLy8gTm9kZSByZXB1bHNpb24gKG5vbiBvdmVybGFwcGluZykgbXVsdGlwbGllclxyXG4gIG5vZGVSZXB1bHNpb246IDQ1MDAsXHJcbiAgLy8gSWRlYWwgZWRnZSAobm9uIG5lc3RlZCkgbGVuZ3RoXHJcbiAgaWRlYWxFZGdlTGVuZ3RoOiA1MCxcclxuICAvLyBEaXZpc29yIHRvIGNvbXB1dGUgZWRnZSBmb3JjZXNcclxuICBlZGdlRWxhc3RpY2l0eTogMC40NSxcclxuICAvLyBOZXN0aW5nIGZhY3RvciAobXVsdGlwbGllcikgdG8gY29tcHV0ZSBpZGVhbCBlZGdlIGxlbmd0aCBmb3IgbmVzdGVkIGVkZ2VzXHJcbiAgbmVzdGluZ0ZhY3RvcjogMC4xLFxyXG4gIC8vIEdyYXZpdHkgZm9yY2UgKGNvbnN0YW50KVxyXG4gIGdyYXZpdHk6IDAuMjUsXHJcbiAgLy8gTWF4aW11bSBudW1iZXIgb2YgaXRlcmF0aW9ucyB0byBwZXJmb3JtXHJcbiAgbnVtSXRlcjogMjUwMCxcclxuICAvLyBGb3IgZW5hYmxpbmcgdGlsaW5nXHJcbiAgdGlsZTogdHJ1ZSxcclxuICAvLyBUeXBlIG9mIGxheW91dCBhbmltYXRpb24uIFRoZSBvcHRpb24gc2V0IGlzIHsnZHVyaW5nJywgJ2VuZCcsIGZhbHNlfVxyXG4gIGFuaW1hdGU6ICdlbmQnLFxyXG4gIC8vIER1cmF0aW9uIGZvciBhbmltYXRlOmVuZFxyXG4gIGFuaW1hdGlvbkR1cmF0aW9uOiA1MDAsXHJcbiAgLy8gUmVwcmVzZW50cyB0aGUgYW1vdW50IG9mIHRoZSB2ZXJ0aWNhbCBzcGFjZSB0byBwdXQgYmV0d2VlbiB0aGUgemVybyBkZWdyZWUgbWVtYmVycyBkdXJpbmcgdGhlIHRpbGluZyBvcGVyYXRpb24oY2FuIGFsc28gYmUgYSBmdW5jdGlvbilcclxuICB0aWxpbmdQYWRkaW5nVmVydGljYWw6IDEwLFxyXG4gIC8vIFJlcHJlc2VudHMgdGhlIGFtb3VudCBvZiB0aGUgaG9yaXpvbnRhbCBzcGFjZSB0byBwdXQgYmV0d2VlbiB0aGUgemVybyBkZWdyZWUgbWVtYmVycyBkdXJpbmcgdGhlIHRpbGluZyBvcGVyYXRpb24oY2FuIGFsc28gYmUgYSBmdW5jdGlvbilcclxuICB0aWxpbmdQYWRkaW5nSG9yaXpvbnRhbDogMTAsXHJcbiAgLy8gR3Jhdml0eSByYW5nZSAoY29uc3RhbnQpIGZvciBjb21wb3VuZHNcclxuICBncmF2aXR5UmFuZ2VDb21wb3VuZDogMS41LFxyXG4gIC8vIEdyYXZpdHkgZm9yY2UgKGNvbnN0YW50KSBmb3IgY29tcG91bmRzXHJcbiAgZ3Jhdml0eUNvbXBvdW5kOiAxLjAsXHJcbiAgLy8gR3Jhdml0eSByYW5nZSAoY29uc3RhbnQpXHJcbiAgZ3Jhdml0eVJhbmdlOiAzLjhcclxufTtcclxuXHJcbmZ1bmN0aW9uIGV4dGVuZChkZWZhdWx0cywgb3B0aW9ucykge1xyXG4gIHZhciBvYmogPSB7fTtcclxuXHJcbiAgZm9yICh2YXIgaSBpbiBkZWZhdWx0cykge1xyXG4gICAgb2JqW2ldID0gZGVmYXVsdHNbaV07XHJcbiAgfVxyXG5cclxuICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcclxuICAgIG9ialtpXSA9IG9wdGlvbnNbaV07XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb2JqO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gX0NvU0VMYXlvdXQoX29wdGlvbnMpIHtcclxuLy8gIFRpbGluZ0V4dGVuc2lvbih0aGlzKTsgLy8gRXh0ZW5kIHRoaXMgaW5zdGFuY2Ugd2l0aCB0aWxpbmcgZnVuY3Rpb25zXHJcbiAgdGhpcy5vcHRpb25zID0gZXh0ZW5kKGRlZmF1bHRzLCBfb3B0aW9ucyk7XHJcbiAgZ2V0VXNlck9wdGlvbnModGhpcy5vcHRpb25zKTtcclxufVxyXG5cclxudmFyIGdldFVzZXJPcHRpb25zID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICBpZiAob3B0aW9ucy5ub2RlUmVwdWxzaW9uICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfUkVQVUxTSU9OX1NUUkVOR1RIID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9SRVBVTFNJT05fU1RSRU5HVEggPSBvcHRpb25zLm5vZGVSZXB1bHNpb247XHJcbiAgaWYgKG9wdGlvbnMuaWRlYWxFZGdlTGVuZ3RoICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfRURHRV9MRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0VER0VfTEVOR1RIID0gb3B0aW9ucy5pZGVhbEVkZ2VMZW5ndGg7XHJcbiAgaWYgKG9wdGlvbnMuZWRnZUVsYXN0aWNpdHkgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9TUFJJTkdfU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX1NQUklOR19TVFJFTkdUSCA9IG9wdGlvbnMuZWRnZUVsYXN0aWNpdHk7XHJcbiAgaWYgKG9wdGlvbnMubmVzdGluZ0ZhY3RvciAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5QRVJfTEVWRUxfSURFQUxfRURHRV9MRU5HVEhfRkFDVE9SID0gRkRMYXlvdXRDb25zdGFudHMuUEVSX0xFVkVMX0lERUFMX0VER0VfTEVOR1RIX0ZBQ1RPUiA9IG9wdGlvbnMubmVzdGluZ0ZhY3RvcjtcclxuICBpZiAob3B0aW9ucy5ncmF2aXR5ICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9TVFJFTkdUSCA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9TVFJFTkdUSCA9IG9wdGlvbnMuZ3Jhdml0eTtcclxuICBpZiAob3B0aW9ucy5udW1JdGVyICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLk1BWF9JVEVSQVRJT05TID0gRkRMYXlvdXRDb25zdGFudHMuTUFYX0lURVJBVElPTlMgPSBvcHRpb25zLm51bUl0ZXI7XHJcbiAgaWYgKG9wdGlvbnMucGFkZGluZ0NvbXBvdW5kICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfR1JBUEhfTUFSR0lOID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFQSF9NQVJHSU4gPSBMYXlvdXRDb25zdGFudHMuREVGQVVMVF9HUkFQSF9NQVJHSU4gPSBvcHRpb25zLnBhZGRpbmdDb21wb3VuZDtcclxuICBpZiAob3B0aW9ucy5ncmF2aXR5UmFuZ2UgIT0gbnVsbClcclxuICAgIENvU0VDb25zdGFudHMuREVGQVVMVF9HUkFWSVRZX1JBTkdFX0ZBQ1RPUiA9IEZETGF5b3V0Q29uc3RhbnRzLkRFRkFVTFRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBvcHRpb25zLmdyYXZpdHlSYW5nZTtcclxuICBpZihvcHRpb25zLmdyYXZpdHlDb21wb3VuZCAhPSBudWxsKVxyXG4gICAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfU1RSRU5HVEggPSBvcHRpb25zLmdyYXZpdHlDb21wb3VuZDtcclxuICBpZihvcHRpb25zLmdyYXZpdHlSYW5nZUNvbXBvdW5kICE9IG51bGwpXHJcbiAgICBDb1NFQ29uc3RhbnRzLkRFRkFVTFRfQ09NUE9VTkRfR1JBVklUWV9SQU5HRV9GQUNUT1IgPSBGRExheW91dENvbnN0YW50cy5ERUZBVUxUX0NPTVBPVU5EX0dSQVZJVFlfUkFOR0VfRkFDVE9SID0gb3B0aW9ucy5ncmF2aXR5UmFuZ2VDb21wb3VuZDtcclxuXHJcbiAgQ29TRUNvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID0gRkRMYXlvdXRDb25zdGFudHMuREVGQVVMVF9JTkNSRU1FTlRBTCA9IExheW91dENvbnN0YW50cy5ERUZBVUxUX0lOQ1JFTUVOVEFMID1cclxuICAgICAgICAgICEob3B0aW9ucy5yYW5kb21pemUpO1xyXG4gIENvU0VDb25zdGFudHMuQU5JTUFURSA9IEZETGF5b3V0Q29uc3RhbnRzLkFOSU1BVEUgPSBvcHRpb25zLmFuaW1hdGU7XHJcbiAgQ29TRUNvbnN0YW50cy5USUxFID0gb3B0aW9ucy50aWxlO1xyXG4gIENvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfVkVSVElDQUwgPSBcclxuICAgICAgICAgIHR5cGVvZiBvcHRpb25zLnRpbGluZ1BhZGRpbmdWZXJ0aWNhbCA9PT0gJ2Z1bmN0aW9uJyA/IG9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsLmNhbGwoKSA6IG9wdGlvbnMudGlsaW5nUGFkZGluZ1ZlcnRpY2FsO1xyXG4gIENvU0VDb25zdGFudHMuVElMSU5HX1BBRERJTkdfSE9SSVpPTlRBTCA9IFxyXG4gICAgICAgICAgdHlwZW9mIG9wdGlvbnMudGlsaW5nUGFkZGluZ0hvcml6b250YWwgPT09ICdmdW5jdGlvbicgPyBvcHRpb25zLnRpbGluZ1BhZGRpbmdIb3Jpem9udGFsLmNhbGwoKSA6IG9wdGlvbnMudGlsaW5nUGFkZGluZ0hvcml6b250YWw7XHJcbn07XHJcblxyXG5fQ29TRUxheW91dC5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciByZWFkeTtcclxuICB2YXIgZnJhbWVJZDtcclxuICB2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcclxuICB2YXIgaWRUb0xOb2RlID0gdGhpcy5pZFRvTE5vZGUgPSB7fTtcclxuICB2YXIgbGF5b3V0ID0gdGhpcy5sYXlvdXQgPSBuZXcgQ29TRUxheW91dCgpO1xyXG4gIHZhciBzZWxmID0gdGhpcztcclxuICBcclxuICB0aGlzLmN5ID0gdGhpcy5vcHRpb25zLmN5O1xyXG5cclxuICB0aGlzLmN5LnRyaWdnZXIoeyB0eXBlOiAnbGF5b3V0c3RhcnQnLCBsYXlvdXQ6IHRoaXMgfSk7XHJcblxyXG4gIHZhciBnbSA9IGxheW91dC5uZXdHcmFwaE1hbmFnZXIoKTtcclxuICB0aGlzLmdtID0gZ207XHJcblxyXG4gIHZhciBub2RlcyA9IHRoaXMub3B0aW9ucy5lbGVzLm5vZGVzKCk7XHJcbiAgdmFyIGVkZ2VzID0gdGhpcy5vcHRpb25zLmVsZXMuZWRnZXMoKTtcclxuXHJcbiAgdGhpcy5yb290ID0gZ20uYWRkUm9vdCgpO1xyXG4gIHRoaXMucHJvY2Vzc0NoaWxkcmVuTGlzdCh0aGlzLnJvb3QsIHRoaXMuZ2V0VG9wTW9zdE5vZGVzKG5vZGVzKSwgbGF5b3V0KTtcclxuXHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZWRnZXMubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBlZGdlID0gZWRnZXNbaV07XHJcbiAgICB2YXIgc291cmNlTm9kZSA9IHRoaXMuaWRUb0xOb2RlW2VkZ2UuZGF0YShcInNvdXJjZVwiKV07XHJcbiAgICB2YXIgdGFyZ2V0Tm9kZSA9IHRoaXMuaWRUb0xOb2RlW2VkZ2UuZGF0YShcInRhcmdldFwiKV07XHJcbiAgICB2YXIgZTEgPSBnbS5hZGQobGF5b3V0Lm5ld0VkZ2UoKSwgc291cmNlTm9kZSwgdGFyZ2V0Tm9kZSk7XHJcbiAgICBlMS5pZCA9IGVkZ2UuaWQoKTtcclxuICB9XHJcbiAgXHJcbiAgIHZhciBnZXRQb3NpdGlvbnMgPSBmdW5jdGlvbihlbGUsIGkpe1xyXG4gICAgaWYodHlwZW9mIGVsZSA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICBlbGUgPSBpO1xyXG4gICAgfVxyXG4gICAgdmFyIHRoZUlkID0gZWxlLmRhdGEoJ2lkJyk7XHJcbiAgICB2YXIgbE5vZGUgPSBzZWxmLmlkVG9MTm9kZVt0aGVJZF07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogbE5vZGUuZ2V0UmVjdCgpLmdldENlbnRlclgoKSxcclxuICAgICAgeTogbE5vZGUuZ2V0UmVjdCgpLmdldENlbnRlclkoKVxyXG4gICAgfTtcclxuICB9O1xyXG4gIFxyXG4gIC8qXHJcbiAgICogUmVwb3NpdGlvbiBub2RlcyBpbiBpdGVyYXRpb25zIGFuaW1hdGVkbHlcclxuICAgKi9cclxuICB2YXIgaXRlcmF0ZUFuaW1hdGVkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gVGhpZ3MgdG8gcGVyZm9ybSBhZnRlciBub2RlcyBhcmUgcmVwb3NpdGlvbmVkIG9uIHNjcmVlblxyXG4gICAgdmFyIGFmdGVyUmVwb3NpdGlvbiA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICBpZiAob3B0aW9ucy5maXQpIHtcclxuICAgICAgICBvcHRpb25zLmN5LmZpdChvcHRpb25zLmVsZXMubm9kZXMoKSwgb3B0aW9ucy5wYWRkaW5nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFyZWFkeSkge1xyXG4gICAgICAgIHJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBzZWxmLmN5Lm9uZSgnbGF5b3V0cmVhZHknLCBvcHRpb25zLnJlYWR5KTtcclxuICAgICAgICBzZWxmLmN5LnRyaWdnZXIoe3R5cGU6ICdsYXlvdXRyZWFkeScsIGxheW91dDogc2VsZn0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICB2YXIgdGlja3NQZXJGcmFtZSA9IHNlbGYub3B0aW9ucy5yZWZyZXNoO1xyXG4gICAgdmFyIGlzRG9uZTtcclxuXHJcbiAgICBmb3IoIHZhciBpID0gMDsgaSA8IHRpY2tzUGVyRnJhbWUgJiYgIWlzRG9uZTsgaSsrICl7XHJcbiAgICAgIGlzRG9uZSA9IHNlbGYubGF5b3V0LnRpY2soKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gSWYgbGF5b3V0IGlzIGRvbmVcclxuICAgIGlmIChpc0RvbmUpIHtcclxuICAgICAgc2VsZi5vcHRpb25zLmVsZXMubm9kZXMoKS5wb3NpdGlvbnMoZ2V0UG9zaXRpb25zKTtcclxuICAgICAgXHJcbiAgICAgIGFmdGVyUmVwb3NpdGlvbigpO1xyXG4gICAgICBcclxuICAgICAgLy8gdHJpZ2dlciBsYXlvdXRzdG9wIHdoZW4gdGhlIGxheW91dCBzdG9wcyAoZS5nLiBmaW5pc2hlcylcclxuICAgICAgc2VsZi5jeS5vbmUoJ2xheW91dHN0b3AnLCBzZWxmLm9wdGlvbnMuc3RvcCk7XHJcbiAgICAgIHNlbGYuY3kudHJpZ2dlcignbGF5b3V0c3RvcCcpO1xyXG4gICAgICBzZWxmLmN5LnRyaWdnZXIoeyB0eXBlOiAnbGF5b3V0c3RvcCcsIGxheW91dDogc2VsZiB9KTtcclxuXHJcbiAgICAgIGlmIChmcmFtZUlkKSB7XHJcbiAgICAgICAgY2FuY2VsQW5pbWF0aW9uRnJhbWUoZnJhbWVJZCk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHNlbGYub3B0aW9ucy5lbGVzLm5vZGVzKCkucmVtb3ZlU2NyYXRjaCgnY29zZUJpbGtlbnQnKTtcclxuICAgICAgcmVhZHkgPSBmYWxzZTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB2YXIgYW5pbWF0aW9uRGF0YSA9IHNlbGYubGF5b3V0LmdldFBvc2l0aW9uc0RhdGEoKTsgLy8gR2V0IHBvc2l0aW9ucyBvZiBsYXlvdXQgbm9kZXMgbm90ZSB0aGF0IGFsbCBub2RlcyBtYXkgbm90IGJlIGxheW91dCBub2RlcyBiZWNhdXNlIG9mIHRpbGluZ1xyXG4gICAgXHJcbiAgICAvLyBQb3NpdGlvbiBub2RlcywgZm9yIHRoZSBub2RlcyB3aG9zZSBpZCBkb2VzIG5vdCBpbmNsdWRlZCBpbiBkYXRhIChiZWNhdXNlIHRoZXkgYXJlIHJlbW92ZWQgZnJvbSB0aGVpciBwYXJlbnRzIGFuZCBpbmNsdWRlZCBpbiBkdW1teSBjb21wb3VuZHMpXHJcbiAgICAvLyB1c2UgcG9zaXRpb24gb2YgdGhlaXIgYW5jZXN0b3JzIG9yIGR1bW15IGFuY2VzdG9yc1xyXG4gICAgb3B0aW9ucy5lbGVzLm5vZGVzKCkucG9zaXRpb25zKGZ1bmN0aW9uIChlbGUsIGkpIHtcclxuICAgICAgaWYgKHR5cGVvZiBlbGUgPT09IFwibnVtYmVyXCIpIHtcclxuICAgICAgICBlbGUgPSBpO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciB0aGVJZCA9IGVsZS5pZCgpO1xyXG4gICAgICB2YXIgcE5vZGUgPSBhbmltYXRpb25EYXRhW3RoZUlkXTtcclxuICAgICAgdmFyIHRlbXAgPSBlbGU7XHJcbiAgICAgIC8vIElmIHBOb2RlIGlzIHVuZGVmaW5lZCBzZWFyY2ggdW50aWwgZmluZGluZyBwb3NpdGlvbiBkYXRhIG9mIGl0cyBmaXJzdCBhbmNlc3RvciAoSXQgbWF5IGJlIGR1bW15IGFzIHdlbGwpXHJcbiAgICAgIHdoaWxlIChwTm9kZSA9PSBudWxsKSB7XHJcbiAgICAgICAgcE5vZGUgPSBhbmltYXRpb25EYXRhW3RlbXAuZGF0YSgncGFyZW50JyldIHx8IGFuaW1hdGlvbkRhdGFbJ0R1bW15Q29tcG91bmRfJyArIHRlbXAuZGF0YSgncGFyZW50JyldO1xyXG4gICAgICAgIGFuaW1hdGlvbkRhdGFbdGhlSWRdID0gcE5vZGU7XHJcbiAgICAgICAgdGVtcCA9IHRlbXAucGFyZW50KClbMF07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB4OiBwTm9kZS54LFxyXG4gICAgICAgIHk6IHBOb2RlLnlcclxuICAgICAgfTtcclxuICAgIH0pO1xyXG5cclxuICAgIGFmdGVyUmVwb3NpdGlvbigpO1xyXG5cclxuICAgIGZyYW1lSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoaXRlcmF0ZUFuaW1hdGVkKTtcclxuICB9O1xyXG4gIFxyXG4gIC8qXHJcbiAgKiBMaXN0ZW4gJ2xheW91dHN0YXJ0ZWQnIGV2ZW50IGFuZCBzdGFydCBhbmltYXRlZCBpdGVyYXRpb24gaWYgYW5pbWF0ZSBvcHRpb24gaXMgJ2R1cmluZydcclxuICAqL1xyXG4gIGxheW91dC5hZGRMaXN0ZW5lcignbGF5b3V0c3RhcnRlZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChzZWxmLm9wdGlvbnMuYW5pbWF0ZSA9PT0gJ2R1cmluZycpIHtcclxuICAgICAgZnJhbWVJZCA9IHJlcXVlc3RBbmltYXRpb25GcmFtZShpdGVyYXRlQW5pbWF0ZWQpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG4gIFxyXG4gIGxheW91dC5ydW5MYXlvdXQoKTsgLy8gUnVuIGNvc2UgbGF5b3V0XHJcbiAgXHJcbiAgLypcclxuICAgKiBJZiBhbmltYXRlIG9wdGlvbiBpcyBub3QgJ2R1cmluZycgKCdlbmQnIG9yIGZhbHNlKSBwZXJmb3JtIHRoZXNlIGhlcmUgKElmIGl0IGlzICdkdXJpbmcnIHNpbWlsYXIgdGhpbmdzIGFyZSBhbHJlYWR5IHBlcmZvcm1lZClcclxuICAgKi9cclxuICBpZih0aGlzLm9wdGlvbnMuYW5pbWF0ZSAhPT0gJ2R1cmluZycpe1xyXG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcclxuICAgICAgc2VsZi5vcHRpb25zLmVsZXMubm9kZXMoKS5ub3QoXCI6cGFyZW50XCIpLmxheW91dFBvc2l0aW9ucyhzZWxmLCBzZWxmLm9wdGlvbnMsIGdldFBvc2l0aW9ucyk7IC8vIFVzZSBsYXlvdXQgcG9zaXRpb25zIHRvIHJlcG9zaXRpb24gdGhlIG5vZGVzIGl0IGNvbnNpZGVycyB0aGUgb3B0aW9ucyBwYXJhbWV0ZXJcclxuICAgICAgc2VsZi5vcHRpb25zLmVsZXMubm9kZXMoKS5yZW1vdmVTY3JhdGNoKCdjb3NlQmlsa2VudCcpO1xyXG4gICAgICByZWFkeSA9IGZhbHNlO1xyXG4gICAgfSwgMCk7XHJcbiAgICBcclxuICB9XHJcblxyXG4gIHJldHVybiB0aGlzOyAvLyBjaGFpbmluZ1xyXG59O1xyXG5cclxuLy9HZXQgdGhlIHRvcCBtb3N0IG9uZXMgb2YgYSBsaXN0IG9mIG5vZGVzXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5nZXRUb3BNb3N0Tm9kZXMgPSBmdW5jdGlvbihub2Rlcykge1xyXG4gIHZhciBub2Rlc01hcCA9IHt9O1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbm9kZXNNYXBbbm9kZXNbaV0uaWQoKV0gPSB0cnVlO1xyXG4gIH1cclxuICB2YXIgcm9vdHMgPSBub2Rlcy5maWx0ZXIoZnVuY3Rpb24gKGVsZSwgaSkge1xyXG4gICAgICBpZih0eXBlb2YgZWxlID09PSBcIm51bWJlclwiKSB7XHJcbiAgICAgICAgZWxlID0gaTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgcGFyZW50ID0gZWxlLnBhcmVudCgpWzBdO1xyXG4gICAgICB3aGlsZShwYXJlbnQgIT0gbnVsbCl7XHJcbiAgICAgICAgaWYobm9kZXNNYXBbcGFyZW50LmlkKCldKXtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudCgpWzBdO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gcm9vdHM7XHJcbn07XHJcblxyXG5fQ29TRUxheW91dC5wcm90b3R5cGUucHJvY2Vzc0NoaWxkcmVuTGlzdCA9IGZ1bmN0aW9uIChwYXJlbnQsIGNoaWxkcmVuLCBsYXlvdXQpIHtcclxuICB2YXIgc2l6ZSA9IGNoaWxkcmVuLmxlbmd0aDtcclxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xyXG4gICAgdmFyIHRoZUNoaWxkID0gY2hpbGRyZW5baV07XHJcbiAgICB0aGlzLm9wdGlvbnMuZWxlcy5ub2RlcygpLmxlbmd0aDtcclxuICAgIHZhciBjaGlsZHJlbl9vZl9jaGlsZHJlbiA9IHRoZUNoaWxkLmNoaWxkcmVuKCk7XHJcbiAgICB2YXIgdGhlTm9kZTtcclxuXHJcbiAgICBpZiAodGhlQ2hpbGQud2lkdGgoKSAhPSBudWxsXHJcbiAgICAgICAgICAgICYmIHRoZUNoaWxkLmhlaWdodCgpICE9IG51bGwpIHtcclxuICAgICAgdGhlTm9kZSA9IHBhcmVudC5hZGQobmV3IENvU0VOb2RlKGxheW91dC5ncmFwaE1hbmFnZXIsXHJcbiAgICAgICAgICAgICAgbmV3IFBvaW50RCh0aGVDaGlsZC5wb3NpdGlvbigneCcpIC0gdGhlQ2hpbGQud2lkdGgoKSAvIDIsIHRoZUNoaWxkLnBvc2l0aW9uKCd5JykgLSB0aGVDaGlsZC5oZWlnaHQoKSAvIDIpLFxyXG4gICAgICAgICAgICAgIG5ldyBEaW1lbnNpb25EKHBhcnNlRmxvYXQodGhlQ2hpbGQud2lkdGgoKSksXHJcbiAgICAgICAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KHRoZUNoaWxkLmhlaWdodCgpKSkpKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICB0aGVOb2RlID0gcGFyZW50LmFkZChuZXcgQ29TRU5vZGUodGhpcy5ncmFwaE1hbmFnZXIpKTtcclxuICAgIH1cclxuICAgIC8vIEF0dGFjaCBpZCB0byB0aGUgbGF5b3V0IG5vZGVcclxuICAgIHRoZU5vZGUuaWQgPSB0aGVDaGlsZC5kYXRhKFwiaWRcIik7XHJcbiAgICAvLyBBdHRhY2ggdGhlIHBhZGRpbmdzIG9mIGN5IG5vZGUgdG8gbGF5b3V0IG5vZGVcclxuICAgIHRoZU5vZGUucGFkZGluZ0xlZnQgPSBwYXJzZUludCggdGhlQ2hpbGQuY3NzKCdwYWRkaW5nLWxlZnQnKSApO1xyXG4gICAgdGhlTm9kZS5wYWRkaW5nVG9wID0gcGFyc2VJbnQoIHRoZUNoaWxkLmNzcygncGFkZGluZy10b3AnKSApO1xyXG4gICAgdGhlTm9kZS5wYWRkaW5nUmlnaHQgPSBwYXJzZUludCggdGhlQ2hpbGQuY3NzKCdwYWRkaW5nLXJpZ2h0JykgKTtcclxuICAgIHRoZU5vZGUucGFkZGluZ0JvdHRvbSA9IHBhcnNlSW50KCB0aGVDaGlsZC5jc3MoJ3BhZGRpbmctYm90dG9tJykgKTtcclxuICAgIC8vIE1hcCB0aGUgbGF5b3V0IG5vZGVcclxuICAgIHRoaXMuaWRUb0xOb2RlW3RoZUNoaWxkLmRhdGEoXCJpZFwiKV0gPSB0aGVOb2RlO1xyXG5cclxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueCkpIHtcclxuICAgICAgdGhlTm9kZS5yZWN0LnggPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc05hTih0aGVOb2RlLnJlY3QueSkpIHtcclxuICAgICAgdGhlTm9kZS5yZWN0LnkgPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjaGlsZHJlbl9vZl9jaGlsZHJlbiAhPSBudWxsICYmIGNoaWxkcmVuX29mX2NoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgdmFyIHRoZU5ld0dyYXBoO1xyXG4gICAgICB0aGVOZXdHcmFwaCA9IGxheW91dC5nZXRHcmFwaE1hbmFnZXIoKS5hZGQobGF5b3V0Lm5ld0dyYXBoKCksIHRoZU5vZGUpO1xyXG4gICAgICB0aGlzLnByb2Nlc3NDaGlsZHJlbkxpc3QodGhlTmV3R3JhcGgsIGNoaWxkcmVuX29mX2NoaWxkcmVuLCBsYXlvdXQpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBAYnJpZWYgOiBjYWxsZWQgb24gY29udGludW91cyBsYXlvdXRzIHRvIHN0b3AgdGhlbSBiZWZvcmUgdGhleSBmaW5pc2hcclxuICovXHJcbl9Db1NFTGF5b3V0LnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMuc3RvcHBlZCA9IHRydWU7XHJcbiAgXHJcbiAgdGhpcy50cmlnZ2VyKCdsYXlvdXRzdG9wJyk7XHJcblxyXG4gIHJldHVybiB0aGlzOyAvLyBjaGFpbmluZ1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXQoY3l0b3NjYXBlKSB7XHJcbiAgcmV0dXJuIF9Db1NFTGF5b3V0O1xyXG59O1xyXG4iLCIndXNlIHN0cmljdCc7XHJcblxyXG4vLyByZWdpc3RlcnMgdGhlIGV4dGVuc2lvbiBvbiBhIGN5dG9zY2FwZSBsaWIgcmVmXHJcbnZhciBnZXRMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xyXG5cclxudmFyIHJlZ2lzdGVyID0gZnVuY3Rpb24oIGN5dG9zY2FwZSApe1xyXG4gIHZhciBMYXlvdXQgPSBnZXRMYXlvdXQoIGN5dG9zY2FwZSApO1xyXG5cclxuICBjeXRvc2NhcGUoJ2xheW91dCcsICdjb3NlLWJpbGtlbnQnLCBMYXlvdXQpO1xyXG59O1xyXG5cclxuLy8gYXV0byByZWcgZm9yIGdsb2JhbHNcclxuaWYoIHR5cGVvZiBjeXRvc2NhcGUgIT09ICd1bmRlZmluZWQnICl7XHJcbiAgcmVnaXN0ZXIoIGN5dG9zY2FwZSApO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHJlZ2lzdGVyO1xyXG4iXX0=
