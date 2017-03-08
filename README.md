# triangle-backing

procedurally generate nice looking tessellated triangle backgrounds for html
elements

##Screenshot

![Screenshot](screenshot.png?raw=true)

##Usage

The following will give every `p` element a tessellated triangle backgrounds.

```javascript
	var p_list = document.getElementsByTagName('p');
	for(var i = p_list.length; i; ){
		TRIANGLE.set_triangle_background(p_list[--i], 15);	
	};
```

`TRIANGLE.set_triangle_background` takes three arguments, two of which are
optional (which is to say, default values are provided.)

1. HTML element to back
2. Radius: a larger radius will produce larger triangles.  The default is 30.
3. List of colors.  The color for any given triangle is selected randomly from
this list.  Default is `['#AAE0FF','#D0FFFF', '#C0C0FF']`

##Math

First we generate a Poisson-disc sample of somewhat evenly spaced points, then
link them together in a Delaunay triangulation.

Also, we remove any triangles that are who's ratio of longest side to area is
too high.  These tend to happen near the edges of the box, and are ugly.
