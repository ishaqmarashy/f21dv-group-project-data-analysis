// scatter plot 
export default class ScatterPlot{ 
  width; height; margin;
  svg; chart; dots; axisX; axisY; labelX; labelY;
  scaleX; scaleY;
  data;colorScale;
  format;
  
  constructor(container, width, height, margin){
      this.width = width;
      this.height = height;
      this.margin = margin;
      this.format= d3.format('.2f')
      this.svg = d3.select(container).append('svg') 
      .classed('scatterPlot', true) 
      .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet') // This keeps the aspect ratio during scaling
            .style('width', '100%') // Make the SVG width responsive
            .style('height', 'auto'); // Adjust the height automatically based on the aspect ratio

      this.chart = this.svg.append('g') 
      .attr('transform', 
      `translate(${this.margin[2]},${this.margin[0]})`);

      this.dots = this.chart.selectAll('dot');
      this.labels = this.chart.selectAll('label');

      this.axisX = this.svg.append('g') 
      .attr('transform',
      `translate(${this.margin[2]},${this.height-this.margin[1]})`);

      this.axisY = this.svg.append('g')
      .attr('transform', 
      `translate(${this.margin[2]},${this.margin[0]})`);

      this.labelX = this.svg.append('text') .classed('legend', true)
      .attr('transform', `translate(${this.width/2},${this.height})`) 
      .style('text-anchor', 'middle').attr('dy',-5);

      this.labelY = this.svg.append('text').classed('legend', true)
      .attr('transform', `translate(0,${this.height/2})rotate(-90)`)
      .style('text-anchor', 'middle').attr('dy',15);

    // Tooltip styles
      this.tooltip = d3.select(container)
      .append("div")
      .style("opacity", 0)
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "1px")
      .style("border-radius", "5px")
      .style("padding", "10px");
  }

  #updateScales(){
      let chartWidth = this.width-this.margin[2]-this.margin[3], 
      chartHeight = this.height-this.margin[0]-this.margin[1]; 

      let rangeX = [0, chartWidth], 
      rangeY = [chartHeight, 0]; 
     // domain of the X axis is 0 up to the maximum value of what is at index 0 of the data   
      let domainX = [0,d3.max(this.data, d=>d[0])], 
     // domain of the Y axis is 0 up to the maximum value of what is at index 1 of the data   
      domainY = [0, d3.max(this.data, d=>d[1])]; 

     // linearly increasing x and y axis scales   
      this.scaleX = d3.scaleLinear(domainX, rangeX); 
      this.scaleY = d3.scaleLinear(domainY, rangeY); 
  }
  
  #updateAxes(){
      let axisGenX = d3.axisBottom(this.scaleX),
      axisGenY = d3.axisLeft(this.scaleY);
      this.axisX.call(axisGenX);
      this.axisY.call(axisGenY);
  }


  #updateDots(){
    // use data to determine the position and color of the svg circles
      this.dots = this.dots 
      .data(this.data, d=>d[0])
      .join('circle') 
      .attr('class', d=>d[0]) 
      .classed('dot', true) 
      .attr('cx', d=>this.scaleX(d[0])) 
      .attr('cy', d=>this.scaleY(d[1])) 
      .attr("r",3 )
      .attr('fill', d => this.colorScale(d[2])) // color based on the colorscales mapping to the datas values
      .style("stroke", "black")
      .style("stroke-width", 0.1);

      this.dots.on("mouseover", (event, d) => {
        this.tooltip.transition()
          .duration(200)
          .style("opacity", 1);
        this.tooltip.html(`Dist: ${this.format(d[1])}<br>
                        Metro Dist: ${this.format(d[0])}<br>
                        Room Type: ${d[2]}<br>`)
        // when mouse is over a circle svg make tooltip visible and move according to mouse positon
          .style("left", (event.pageX) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
        // when mouse leaves circle make tooltip invisible
      .on("mouseout", () => {
        this.tooltip.transition()
          .duration(200)
          .style("opacity", 0);
      });
  }

  // map the unique values of the data index 2 to the 3 blue colors by their order  
  #updateDotColor(){
      this.colorScale= d3.scaleOrdinal()
      .domain(new Set(this.data.map(d => d[2]))) 
      .range(['#deebf7','#9ecae1','#3182bd']);
  }

  // Public API
  // dataset should be formatted [v1,v2]
  render(dataset){
      this.data = dataset;
      this.#updateScales();
      this.#updateDotColor();
      this.#updateDots();
      this.#updateAxes();
      return this;
  }

  setLabels(labelX='categories', labelY='values'){
      this.labelX.text(labelX);
      this.labelY.text(labelY);
      return this;
  }
}
