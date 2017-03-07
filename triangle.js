TRIANGLE = (function(){
var triangle = {};

triangle.set_triangle_background = function(
	element,
	radius = 30,
	colors = ['#AAE0FF','#D0FFFF', '#C0C0FF']){

	var bounding_box = element.getBoundingClientRect();
	var vertices = poisson_disc(
		bounding_box.width,
		bounding_box.height,
		radius
	);

	//create an off screen canvas object on which to draw
	var canvas = document.createElement('canvas');
	canvas.width = bounding_box.width;
	canvas.height = bounding_box.height;
	var ctx = canvas.getContext('2d');
 	
	var triangles = DELAUNAY.triangulate(vertices);
	for(i = triangles.length; i; ) {
		ctx.fillStyle = colors[Math.floor(Math.random()*colors.length)];
		--i; var a = vertices[triangles[i]];
		--i; var b = vertices[triangles[i]];
		--i; var c = vertices[triangles[i]];
		if( length_2(a,b,c) / triangle_area(a,b,c) < 8	){
			//exclude triangles that are overly flat.	They tend to occur at
			//the boundaries of the square, and look ugly.
			ctx.beginPath();
			ctx.moveTo(a[0], a[1]);
			ctx.lineTo(b[0], b[1]);
			ctx.lineTo(c[0], c[1]);
			ctx.closePath();
			ctx.fill();
		}
			}

	//set the background!
	element.style['background-image'] =
		"url(" + canvas.toDataURL("image/png",1.0) + ")";
}

return triangle;

function triangle_area(a, b, c){
	return 0.5 * Math.abs(
		a[0]*b[1] + b[0]*c[1] + c[0]*a[1] - b[0]*a[1]-c[0]*b[1] - a[0]*c[1]
	);
}

function distance_2(a ,b){
	return (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1]);
}

//find the longest side of a triangle
function length_2(a, b, c){
	return Math.max( distance_2(a, b),	Math.max(distance_2(b, c), distance_2(c, a) ));
}


function poisson_disc(width, height, radius){

	var k = 20, // maximum number of samples before rejection
		radius2 = radius * radius,
		R = 3 * radius2,
		cell_size = radius * Math.SQRT1_2,
		grid_width = Math.ceil(width / cell_size),
		grid_height = Math.ceil(height / cell_size),
		grid = new Array(grid_width * grid_height),
		open_queue = [],
		open_queue_size = 0,
		queue = [];

	sample(Math.random() * width, Math.random() * height);

	while(open_queue_size > 0){
		var i = Math.random() * open_queue_size | 0,
			s = open_queue[i],
			j = 0;
			generate_candidate();
	}

	return queue;

	function generate_candidate() {
		//quit, if we've already tried too many times
		if (++j > k) return reject_active();

		//angle radius position
		var a = 2 * Math.PI * Math.random(),
			r = Math.sqrt(Math.random() * R + radius2),
			x = s[0] + r * Math.cos(a),
			y = s[1] + r * Math.sin(a);

		// Reject candidates that are outside the allowed extent.
		if (0 > x || x >= width || 0 > y || y >= height)
			return generate_candidate();

		return far(x, y) ? sample(x, y) : generate_candidate();
	}

	function reject_active() {
		open_queue[i] = open_queue[--open_queue_size];
		open_queue.length = open_queue_size;
	}

	//determine if a prospective point is adequately distant from any existing
	//point
	function far(x, y) {
		var i = x / cell_size | 0,
			j = y / cell_size | 0,
			i0 = Math.max(i - 2, 0),
			j0 = Math.max(j - 2, 0),
			i1 = Math.min(i + 3, grid_width),
			j1 = Math.min(j + 3, grid_height);

		for (j = j0; j < j1; ++j) {
			var o = j * grid_width;
			for (i = i0; i < i1; ++i) {
				if (s = grid[o + i]) {
					var s,
						dx = s[0] - x,
						dy = s[1] - y;
					if (dx * dx + dy * dy < radius2) {
						return false;
					}
				}
			}
		}
		return true;
	}

	//accept a point and add it to the queue.
	function sample(x, y) {
		var s = [x, y];

		open_queue.push(s);
		grid[grid_width * (y / cell_size | 0) + (x / cell_size | 0)] = s;
		++open_queue_size;

		queue.push(s);
		return s;
	}

	//
}})();

DELAUNAY = (function(){
	var delaunay = {};

	EPSILON = 1.0 / 1048576.0; //2^20

	delaunay.triangulate = function(vertices) {
		var n = vertices.length;
		var a, b, c; //points reused 

		if(n < 3)
			return [];

		//copy the vertices array
		vertices = vertices.slice(0);

		var indices = new Array(n);

		for(var i = n; i--; )
			indices[i] = i;
		//sort indices based on x position
		indices.sort(function(i, j) {
			return vertices[j][0] - vertices[i][0];
		});

		//find the super triangle and 
		var st = super_triangle(vertices);
		vertices.push(st[0], st[1], st[2]);
		
		//put the super triangle on the open list
		var open = [circum_circle(vertices, n + 0, n + 1, n + 2)];
		var closed = [];
		var edges = [];

		//for each vertex
		for(var i = indices.length; i--; edges.length = 0) {
			var c = indices[i];

			//is point c inside the circle of any open triangle?
			for(var j = open.length; j--; ) {
				//if this point is to the right of the circles center, we can
				//reject the triangle and put it on the closed list
				var dx = vertices[c][0] - open[j].x;
				if(dx > 0.0 && dx * dx > open[j].r) {
					closed.push(open[j]);
					open.splice(j, 1);
					continue;
				}

				//if we're outside the circle, we're all good.  continue..
				var dy = vertices[c][1] - open[j].y;
				if(dx * dx + dy * dy - open[j].r > EPSILON)
					continue;

				//this point falls inside a triangle, so the triangle is bogus.
				//remove the triangle from the open list and add it's edges to
				//the edge list.
				edges.push(
					open[j].i, open[j].j,
					open[j].j, open[j].k,
					open[j].k, open[j].i
				);
				open.splice(j, 1);
			}


			remove_duplicate_edges(edges);

			//add a new triangle for each edge.
			for(j = edges.length; j; ) {
				var b = edges[--j];
				var a = edges[--j];
				open.push(circum_circle(vertices, a, b, c));
			}
		}

		/* Copy any remaining open triangles to the closed list, and then
		 * remove any triangles that share a vertex with the super_triangle,
		 * building a list of triplets that represent triangles. */
		for(i = open.length; i--; )
			closed.push(open[i]);
		open.length = 0;

		for(i = closed.length; i--; )
			if(closed[i].i < n && closed[i].j < n && closed[i].k < n)
				open.push(closed[i].i, closed[i].j, closed[i].k);

		return open;
	};


	//find the largest triangle
	function super_triangle(vertices) {
		var xmin = Number.POSITIVE_INFINITY,
			ymin = Number.POSITIVE_INFINITY,
			xmax = Number.NEGATIVE_INFINITY,
			ymax = Number.NEGATIVE_INFINITY,
			dx, dy, dmax, xmid, ymid;

		for(var i = vertices.length; i--; ) {
			xmin = Math.min(xmin, vertices[i][0]);
			xmax = Math.max(xmax, vertices[i][0]);
			ymin = Math.min(ymin, vertices[i][1]);			
			ymax = Math.max(ymax, vertices[i][1]);
			
		}

		dx = xmax - xmin;
		dy = ymax - ymin;
		dmax = Math.max(dx, dy);
		xmid = xmin + dx * 0.5;
		ymid = ymin + dy * 0.5;

		return [
			[xmid - 20 * dmax, ymid -			dmax],
			[xmid						, ymid + 20 * dmax],
			[xmid + 20 * dmax, ymid -			dmax]
		];
	}

	//calculate the center and radius of the circle passing through the
	//vertices at indexes i, j, k
	function circum_circle(vertices, i, j, k) {
		var x1 = vertices[i][0],
			y1 = vertices[i][1],
			x2 = vertices[j][0],
			y2 = vertices[j][1],
			x3 = vertices[k][0],
			y3 = vertices[k][1],
			dy12 = Math.abs(y1 - y2), //distance between 1.y ,and 2.y
			dy23 = Math.abs(y2 - y3), //distance  between 2.y ,and 3.y
			xc, yc, //circle center
			m1, m2, //gradients 
			mx12, my12, //midpoint for points 1 and 2
			mx23, my23, //midpoints for points 2 and 3
			dx, dy;

		/* Check for coincident points */
		if(dy12 < EPSILON && dy23 < EPSILON)
			throw new Error("Eek! Coincident points!");

		if(dy12 < EPSILON) {
			m2	= -((x3 - x2) / (y3 - y2));
			mx23 = (x2 + x3) / 2.0;
			my23 = (y2 + y3) / 2.0;
			xc	= (x2 + x1) / 2.0;
			yc	= m2 * (xc - mx23) + my23;
		}

		else if(dy23 < EPSILON) {
			m1	= -((x2 - x1) / (y2 - y1));
			mx12 = (x1 + x2) / 2.0;
			my12 = (y1 + y2) / 2.0;
			xc	= (x3 + x2) / 2.0;
			yc	= m1 * (xc - mx12) + my12;
		}

		else {
			m1	= -((x2 - x1) / (y2 - y1));
			m2	= -((x3 - x2) / (y3 - y2));
			mx12 = (x1 + x2) / 2.0;
			mx23 = (x2 + x3) / 2.0;
			my12 = (y1 + y2) / 2.0;
			my23 = (y2 + y3) / 2.0;
			xc	= (m1 * mx12 - m2 * mx23 + my23 - my12) / (m1 - m2);
			yc	= (dy12 > dy23) ?
				m1 * (xc - mx12) + my12 :
				m2 * (xc - mx23) + my23;
		}

		dx = x2 - xc;
		dy = y2 - yc;
		return {
			i: i,
			j: j,
			k: k,
			x: xc,
			y: yc,
			r: dx * dx + dy * dy
		};
	}

	function remove_duplicate_edges(edges) {
		var a, b, m, n;

		for(var j = edges.length; j; ) {
			b = edges[--j];
			a = edges[--j];

			for(var i = j; i; ) {
				n = edges[--i];
				m = edges[--i];

				if((a === m && b === n) || (a === n && b === m)) {
					edges.splice(j, 2);
					edges.splice(i, 2);
					break;
				}
			}
		}
	}

	return delaunay;

})();



