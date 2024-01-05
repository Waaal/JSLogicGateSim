function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

class Grid {
    constructor(ctx, width, height, c)
    {
        makeid.bind(this);

        this.gridColor = c;

        this.ctx = ctx;
        this.width = width;
        this.height = height;

        this.rectangleSize = 25;
        this.inOutSize = 10;
        this.zoom = 1.4;

        this.rectangleSizeZoom = this.rectangleSize*this.zoom;
        this.inOutSizeZoom = this.inOutSize*this.zoom;

        this.lastConnectionPos = undefined;

        this.bluePrint = undefined;

        this.gates = new Array();
        this.inOutRender = new Array();

        this.bluePrintConnection = new Array();
        this.startNewConnection = false;
        this.overrideConnection = undefined;
        this.connectonOrderCounter = 0;

        this.overrideConnectionArr = [];

        // ===== LOGIC =====

        this.connections = new Array();

        this.connectionTable = new Array();

        this.inConnections = new Array();
        this.outConnections = new Array();
    }

    initGrid(pos)
    {
        this.ctx.beginPath();
        this.ctx.lineWidth = 2;
        this.move(pos);
    }

    move(pos, updateSimulation = true)
    {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.ctx.beginPath();
        let xLimit = Math.ceil(this.width / this.rectangleSizeZoom);
        let yLimit = Math.ceil(this.height / this.rectangleSizeZoom);

        let xStart = Math.ceil(pos.x / this.rectangleSizeZoom)*-1;
        let yStart = Math.ceil(pos.y / this.rectangleSizeZoom)*-1;

        for(let x = xStart; x <= xStart+xLimit; x++)
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*x),pos.y);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*x),this.height);
        }

        for(let y = yStart; y <= yStart+yLimit; y++)
        {
            this.ctx.moveTo(pos.x,pos.y+(this.rectangleSizeZoom*y));
            this.ctx.lineTo(this.width, pos.y+(this.rectangleSizeZoom*y));
        }

        this.ctx.strokeStyle = this.gridColor;
        this.ctx.stroke();  
        
        if(this.bluePrint != undefined)
        {
            this.ctx.beginPath();
            this.ctx.fillStyle = "black";
            this.renderGate(pos, xStart, yStart, this.bluePrint);
            this.ctx.fill();
        }

        this.gates.forEach(gate => {
            this.ctx.beginPath();
            this.ctx.fillStyle = gate.color;
            this.renderGate(pos, xStart, yStart, gate);
            this.ctx.fill();
        })


        this.ctx.beginPath();
        this.ctx.strokeStyle = "green";
        Object.keys(this.bluePrintConnection).forEach(kConn =>{
            this.renderConnection(pos, xStart, yStart,this.bluePrintConnection[kConn], "w");
        });
        this.ctx.stroke(); 

        this.connections.forEach(arr =>{       
            this.ctx.beginPath();
            switch(arr.state)
            {
                case 0:
                    this.ctx.strokeStyle = "blue";
                    break;
                case 1:
                    this.ctx.strokeStyle = "red";
                    break;
                case 2:
                    this.ctx.strokeStyle = "grey";
                    break;
            }

            Object.keys(arr.conn).forEach(kConn =>{
                this.renderConnection(pos, xStart, yStart,arr.conn[kConn]);
            });

            this.ctx.stroke(); 
        })

        this.ctx.beginPath();
        this.ctx.fillStyle = "grey";
        this.inOutRender.forEach( inOut =>{
            this.renderInOut(inOut);
        })
        this.ctx.fill();

        this.inOutRender = new Array();

        if(this.bluePrint == undefined && updateSimulation)
        {
            this.checkConnections();
            this.simulate(pos);
        }
    }

    betterZoom(zoom, pos)
    {
        let oldZoom = this.zoom;
        this.zoom += zoom;

        if(this.zoom < 0.2 || this.zoom > 3)
        {
            this.zoom = oldZoom;
            return Math.round((this.zoom + Number.EPSILON) * 100) / 100;
        }
        this.rectangleSizeZoom = this.rectangleSize*this.zoom;
        this.inOutSizeZoom = this.inOutSize*this.zoom;
        this.move(pos);

        return Math.round((this.zoom + Number.EPSILON) * 100) / 100;
    }

    getCellPos(mousePos, pos)
    {
        let xLimit = Math.ceil(this.width / this.rectangleSizeZoom);
        let yLimit = Math.ceil(this.height / this.rectangleSizeZoom);

        let xStart = Math.ceil(pos.x / this.rectangleSizeZoom)*-1;
        let yStart = Math.ceil(pos.y / this.rectangleSizeZoom)*-1;

        mousePos.y -= pos.y;
        mousePos.x -= pos.x;

        let posX = -1;
        for(let x = xStart-1; x < xLimit+xStart; x++)
        {
            if(mousePos.x >= (this.rectangleSizeZoom*x) && (mousePos.x <= (this.rectangleSizeZoom*x)+this.rectangleSizeZoom))
            {
                posX = x+1;
                break;
            }
        }

        let posY = -1;
        for(let y = yStart-1; y < yLimit+yStart; y++)
        {
            if(mousePos.y >= (this.rectangleSizeZoom*y) && (mousePos.y <= (this.rectangleSizeZoom*y)+this.rectangleSizeZoom))
            {
                posY = y+1;
                break;
            }
        }

        return {x: posX, y: posY};
    }

    openContextMenu(pos, relativePos)
    {
        relativePos.x -=1;
        relativePos.y -=1;

        let gate = undefined;

        for(let x = 0; x < 2; x++)
        {
            for(let y = 0; y < 2; y++)
            {
                gate = this.gates.find(e => (e.pos.x+x == relativePos.x && e.pos.y+y == relativePos.y));
                if(gate)
                {
                    x = 3; 
                    y = 3;
                }
            }
        }

        if(!gate)
        {
            this.connections.forEach(conn =>{
                let found = false;
                Object.keys(conn.conn).every(key =>
                    {
                        if(conn.conn[key].pos.y == relativePos.y && conn.conn[key].pos.x == relativePos.x)
                        {
                            found = true;
                            return false;
                        }
                        return true;
                    });
                if(found)
                {
                    gate = conn;
                    gate.ID = conn.connID;
                    gate.name = "Connection";
                    gate.type = "connection";
                }
            });

        }

        if(gate != undefined)
        {
            let ret = 
            {
                ID: gate.ID,
                name: gate.name,
                color: gate.color,
                in: gate.in,
                out: gate.out,
                pos: gate.pos,
                size: gate.size,
                type: gate.type
            };
            return ret;
        }
        else{
            return undefined;
        }

    }
    
    placeGate(gate)
    {
        let id = makeid(6);
        while(this.gates.find(g => g.ID == id))
        {
            id = makeid(6);
        }
        gate.ID = id;
        this.gates.push(gate);
    }

    showConnection(pos, relativePos, place = false)
    {
        relativePos.x -=1;
        relativePos.y -=1;
        if(!this.startNewConnection || place)
        {
            let connectionIndex = this.connections.findIndex(e => (e.end == (relativePos.x + "-" + relativePos.y)));
            if(connectionIndex != -1)
            {
                this.overrideConnection = this.connections[connectionIndex];
                this.overrideConnection["isEnd"] = true;
                this.overrideConnection["index"] = connectionIndex;

                this.overrideConnectionArr.push(this.overrideConnection);
            }
            else
            {
                connectionIndex = this.connections.findIndex(e => (e.start == (relativePos.x + "-" + relativePos.y)));
                if(connectionIndex != -1)
                {
                    this.overrideConnection = this.connections[connectionIndex];;
                    this.overrideConnection["isEnd"] = false;
                    this.overrideConnection["index"] = connectionIndex;
                }
            }
            this.startNewConnection = true;
        }

        if(this.bluePrintConnection[relativePos.x + "-" + relativePos.y] == undefined)
        {
            //let xStart = Math.ceil(pos.x / this.rectangleSizeZoom)*-1;
            //let yStart = Math.ceil(pos.y / this.rectangleSizeZoom)*-1;

            //relativePos.x += xStart - 1;
            //relativePos.y += yStart - 1;

            let dir = "w";

            if(this.lastConnectionPos != undefined)
            {
                if(this.lastConnectionPos.y != relativePos.y)
                {
                    dir = "s";
                }
            }
            this.lastConnectionPos = relativePos;

            this.bluePrintConnection[relativePos.x + "-" + relativePos.y] = {pos: relativePos, dir: dir, order: this.connectonOrderCounter};
            this.connectonOrderCounter++;

            this.move(pos, false);
        }
        
        if(place)
        {
            let ok = false;
            if(this.overrideConnection != undefined)
            {
                ok = true;
                //append connection to already existing connection
                let index = this.connectionTable.findIndex(e => (this.connections[this.overrideConnection.index].conn[this.connections[this.overrideConnection.index].start].pos == e.start.pos && this.connections[this.overrideConnection.index].conn[this.connections[this.overrideConnection.index].end].pos == e.end.pos));
                if(index != -1)
                {
                    if(this.overrideConnection.isEnd)
                    {
                        if(this.connectionTable[index].end.type != "none")
                        {
                            ok = false;
                            console.log("Make new connection");
                        }
                    }
                    else
                    {
                        if(this.connectionTable[index].start.type != "none")
                        {
                            ok = false;
                            console.log("Make new connection");
                        }
                    }
                }
                if(ok)
                {
                    if(index != -1)
                    {
                        this.connectionTable.splice(index,1);
                    }

                    let orderStartKey, orderEndKey;

                    let lastOrder = 0;

                    Object.keys(this.bluePrintConnection).forEach(key => {
                        if(this.bluePrintConnection[key].order == 0)
                        {
                            orderStartKey = key;
                        }
                        if(this.bluePrintConnection[key].order > lastOrder)
                        {
                            orderEndKey = key;
                            lastOrder = this.bluePrintConnection[key].order;
                        }
                        this.connections[this.overrideConnection.index].conn[key] = this.bluePrintConnection[key];
                    });

                    let start, end;
                    if(orderStartKey == this.connections[this.overrideConnection.index].end)
                    {
                        start = this.connections[this.overrideConnection.index].start;
                        end = orderEndKey;
                    }
                    else if(orderStartKey == this.connections[this.overrideConnection.index].start)
                    {
                        start = this.connections[this.overrideConnection.index].end;
                        end = orderEndKey;
                    }

                    if(orderEndKey == this.connections[this.overrideConnection.index].end)
                    {
                        start = this.connections[this.overrideConnection.index].start;
                        end = orderStartKey;
                    }
                    else if(orderEndKey == this.connections[this.overrideConnection.index].start)
                    {
                        start = this.connections[this.overrideConnection.index].end;
                        end = orderStartKey;
                    }

                    this.connections[this.overrideConnection.index].end = end;
                    this.connections[this.overrideConnection.index].start = start;

                    this.connections[this.overrideConnection.index] = this.checkConnectionEdge(this.connections[this.overrideConnection.index]);
                }
            }

            if(!ok)
            {
                let obj = { state:2, connID: makeid(6),conn:this.bluePrintConnection};
                obj = this.checkConnectionEdge(obj);
    
                let start = Object.keys(this.bluePrintConnection)[0];
                let end = Object.keys(this.bluePrintConnection)[Object.keys(this.bluePrintConnection).length-1];
    
                this.connections.push({ state:2, start:start, end:end ,connID: makeid(6),conn:this.bluePrintConnection});
            }

            this.bluePrintConnection = [];
            this.move(pos);

            this.startNewConnection = false;
            this.overrideConnection = undefined;
            this.lastConnectionPos = undefined;
            this.connectonOrderCounter = 0;
        }
    }

    checkConnectionEdge(obj)
    {
        Object.keys(obj.conn).forEach(kConn =>{
            
            let arr = [
                {dir: "rd", check: obj.conn[kConn].pos.x + "-" + (obj.conn[kConn].pos.y-1), check2: (obj.conn[kConn].pos.x-1) + "-" + (obj.conn[kConn].pos.y-1)},
                {dir: "ld", check: obj.conn[kConn].pos.x + "-" + (obj.conn[kConn].pos.y-1), check2: (obj.conn[kConn].pos.x+1) + "-" + (obj.conn[kConn].pos.y-1)},
                {dir: "ru", check: obj.conn[kConn].pos.x + "-" + (obj.conn[kConn].pos.y+1), check2: (obj.conn[kConn].pos.x-1) + "-" + (obj.conn[kConn].pos.y+1)},
                {dir: "lu", check: obj.conn[kConn].pos.x + "-" + (obj.conn[kConn].pos.y+1), check2: (obj.conn[kConn].pos.x+1) + "-" + (obj.conn[kConn].pos.y+1)},
            ];
            arr.forEach(e =>
                {
                    if(obj.conn[e.check] != undefined && obj.conn[e.check2] != undefined)
                    {
                        obj.conn[e.check].dir = e.dir;
                    }
                });

        });
        return obj;
    }

    showBluePrint(pos, relativePos, part, func, place = false)
    {
        //let xStart = Math.ceil(pos.x / this.rectangleSizeZoom)*-1;
        //let yStart = Math.ceil(pos.y / this.rectangleSizeZoom)*-1;

        //relativePos.x += xStart - 1;
        //relativePos.y += yStart - 1;

        relativePos.x -=1;
        relativePos.y -=1;

        this.bluePrint = structuredClone(part);

        this.bluePrint.pos = relativePos;
        this.bluePrint.function = func;

        //this.bluePrint.size.w = Math.floor((this.bluePrint.name.length / 2) * 1.5);
        this.bluePrint.size.h =Math.max(this.bluePrint.in, this.bluePrint.out);

        if(place)
        {
            this.placeGate(this.bluePrint)
            this.bluePrint = undefined;
        }
        this.move(pos, place);
    }

    renderGate(pos, xStart, yStart, gate)
    {
        if(xStart > gate.pos.x+1 || yStart > gate.pos.y+1)
        {
            return;
        }

        let inPlaced = 0, outPlaced = 0;

        for(let x = gate.pos.x; x < gate.pos.x+gate.size.w ;x++)
        {
            for(let y = gate.pos.y; y < gate.pos.y+gate.size.h ;y++)
            {
                this.ctx.rect(pos.x+(this.rectangleSizeZoom*x), pos.y+(this.rectangleSizeZoom*y),
                this.rectangleSizeZoom, this.rectangleSizeZoom);

                if(inPlaced < gate.in && x == gate.pos.x)
                {
                    this.inOutRender.push({
                        x: pos.x+(this.rectangleSizeZoom*x)-(this.rectangleSizeZoom/2)+this.inOutSizeZoom/2,
                        y:pos.y+(this.rectangleSizeZoom*y)+(this.rectangleSizeZoom/2)-this.inOutSizeZoom/2
                    });

                    if(gate.ID != "bluePrint")
                    {
                        if(!this.inConnections.find(e => (e.ID === gate.ID && e.place == inPlaced)))
                        {
                            this.inConnections.push({ID: gate.ID, pos:{x:gate.pos.x-1, y:gate.pos.y+inPlaced}, place: inPlaced, state: 2});
                        }
                    }
                    inPlaced++;
                }

                if(outPlaced < gate.out && x == gate.pos.x+gate.size.w-1)
                {
                    this.inOutRender.push({
                        x: pos.x+gate.size.w+(this.rectangleSizeZoom*x)+(this.rectangleSizeZoom/2)+this.inOutSizeZoom/2,
                        y:pos.y+gate.size.h+(this.rectangleSizeZoom*y)+(this.rectangleSizeZoom/2)-this.inOutSizeZoom/2
                    });

                    if(gate.ID != "bluePrint")
                    {
                        if(!this.outConnections.find(e => (e.ID === gate.ID && e.place == outPlaced)))
                        {
                            this.outConnections.push({ID: gate.ID, pos:{x: gate.pos.x+gate.size.w, y: gate.pos.y+outPlaced}, place: outPlaced, state: 0});
                        }
                    }
                    outPlaced++;
                }
            }
        }
    }

    renderConnection(pos, xStart, yStart, conn)
    {
        let cPos = conn.pos;
        let dir = conn.dir;

        if(dir == "s")
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y));
        }
        else if(dir == "w")
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x), pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
        }
        else if(dir == "rd")
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*cPos.x), pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom);
        }
        else if(dir == "ld")
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom);
        }
        else if(dir == "ru")
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*cPos.x), pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/20);
        }
        else if(dir == "lu")
        {
            this.ctx.moveTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/2);
            this.ctx.lineTo(pos.x+(this.rectangleSizeZoom*cPos.x)+this.rectangleSizeZoom/2, pos.y+(this.rectangleSizeZoom*cPos.y)+this.rectangleSizeZoom/20);
        }
    }

    renderInOut(r)
    {
        this.ctx.rect(r.x, r.y, this.inOutSizeZoom, this.inOutSizeZoom);
    }

    deleteConnection(pos, ID)
    {
        let connectionIndex = this.connections.findIndex(e => (e.connID == ID));
        if(connectionIndex != -1)
        {
            let connTableIndex = this.connectionTable.findIndex(e=> (e.start.connID == ID));
            if(connTableIndex != -1)
            {
                this.connectionTable.splice(connTableIndex, 1);
            }

            this.connections.splice(connectionIndex, 1);

            this.move(pos);
        }
    }

    deleteGate(pos, ID)
    {
        let gateIndex = this.gates.findIndex(e => (e.ID == ID));
        if(gateIndex != -1)
        {
            let inIndex = 0;
            while(inIndex != -1)
            {
                inIndex = this.inConnections.findIndex(e => (e.ID == ID));
                if(inIndex != -1)
                {
                    this.inConnections.splice(inIndex, 1);
                }
            }

            let outIndex = this.outConnections.findIndex(e => (e.ID == ID));
            if(outIndex != -1)
            {
                this.outConnections.splice(outIndex, 1);
            }

            let connTableIndex = 0;
            while(connTableIndex != -1)        
            {
                connTableIndex = this.connectionTable.findIndex(e => (e.start.from == ID || e.end.from == ID));
                if(connTableIndex != -1)
                {
                    let connIndex = this.connections.findIndex(e => (e.connID == this.connectionTable[connTableIndex].start.connID));
                    if(connIndex != -1)
                    {
                        this.connections[connIndex].state = 2;
                    }
                    this.connectionTable.splice(connTableIndex, 1);
                }
            }

            this.gates.splice(gateIndex, 1);
            this.move(pos);
        }
    }

    handleClick(pos, relativePos)
    {
        relativePos.x -= 1;
        relativePos.y -= 1;

        let button = this.gates.findIndex(e => (e.pos.x == relativePos.x && e.pos.y == relativePos.y && e.type == "button"));
        if(button != -1)
        {
           let outIndex = this.outConnections.findIndex(e => (e.ID == this.gates[button].ID)); 
           
           this.gates[button].color = "darkblue";
           let state = 0;
           if(this.outConnections[outIndex].state == 0)
           {
            this.gates[button].color = "red";
            state = 1;
           }
           this.outConnections[outIndex].state = state;

           this.move(pos);
        }
    }

    checkConnections()
    {
        let counter = 0;
        this.connections.forEach(c =>{
            //let startConn = c.conn[Object.keys(c.conn)[0]].pos;
            //let endConn = c.conn[Object.keys(c.conn)[Object.keys(c.conn).length-1]].pos;

            let startConn = c.conn[c.start].pos;
            let endConn = c.conn[c.end].pos;

            let startConnection = this.inConnections.find(e => (e.pos.x == startConn.x && e.pos.y == startConn.y));
            if(!startConnection)
            {
                startConnection = this.outConnections.find(e => (e.pos.x == startConn.x && e.pos.y == startConn.y));
                if(startConnection)
                {
                    startConnection["type"] = "out";
                }
            }
            else
            {
                startConnection["type"] = "in";
            }

            let endConnection = this.inConnections.find(e => (e.pos.x == endConn.x && e.pos.y == endConn.y));
            if(!endConnection)
            {
                endConnection = this.outConnections.find(e => (e.pos.x == endConn.x && e.pos.y == endConn.y));
                if(endConnection)
                {
                    endConnection["type"] = "out";
                }
            }
            else
            {
                endConnection["type"] = "in";
            }

            //make another connection type.
            //cabel so that multiple cable can get a state from a cabel
            //when state 2 cabel does not multiplie state

            if(startConnection || endConnection)
            {
                let start, end;
                if(startConnection)
                {
                    start = {
                        from: startConnection.ID,
                        connID: c.connID,
                        type: startConnection.type,
                        place: startConnection.place,
                        state: c.state,
                        pos: startConn
                    }
                }

                if(endConnection)
                {
                    end = {
                        from: endConnection.ID,
                        connID: c.connID,
                        type: endConnection.type,
                        place: endConnection.place,
                        state: c.state,
                        pos: endConn
                    }
                }

                if(startConnection && !endConnection)
                {
                    end = {
                        from: startConnection.ID,
                        connID: c.connID,
                        type: "none",
                        place: startConnection.place,
                        state: c.state,
                        pos: endConn
                    }
                }
                else if(!startConnection && endConnection)
                {
                    start = {
                        from: endConnection.ID,
                        connID: c.connID,
                        type: "none",
                        place: endConnection.place,
                        state: c.state,
                        pos: startConn
                    }
                }

                //user cannot connect out to out please
                if(!(start.type == "out" && end.type == "out"))
                {
                    let index = this.connectionTable.findIndex(e => (
                        (e.start.from == e.start.from && e.end.from == e.start.from) &&
                        (e.start.pos == start.pos || e.end.pos == end.pos) &&
                        (e.start.place == start.place || e.end.place == end.place)
                    ));
                    
                    if(!this.connectionTable.find(e => (e.start.from == start.from && e.end.from == end.from && e.start.place == start.place && e.end.place == end.place && e.start.pos == start.pos && e.end.pos == end.pos)))
                    {
                        this.connectionTable.push({start: start, end: end});
    
                        //when place gate on none connection he creates new connection table entry
                        if(index != -1)
                        {
                            this.connectionTable.splice(index, 1);
                        }
                    }
                }
                else
                {
                    console.log("Dont connect output to output");
                    let index = this.connections.findIndex(e => e.connID == c.connID);
                    if(index != -1)
                    {
                        this.connections.splice(index, 1);
                    }
                }
            }
            else
            {
                this.connections[counter].state = 2;
            }
            counter++;
        });
    }

    simulate(pos)
    {
        let stable = false;
        let endCounter = 0;
        while(!stable && endCounter < 500)
        {
            stable = true;

            let counter = 0;
            this.connectionTable.forEach(connection =>{
                let lastState = "";
                Object.keys(connection).forEach(key =>
                {
                    let c = connection[key];
                    if(c.type == "out")
                    {
                        let gateOut = this.outConnections.find(e => e.ID == c.from);
                        if(gateOut.state != 2)
                        {
                            if(this.connectionTable[counter]["start"].state != gateOut.state || this.connectionTable[counter]["end"].state != gateOut.state)
                            {
                                stable = false;
                            }
        
                            this.connectionTable[counter]["start"].state = gateOut.state;
                            this.connectionTable[counter]["end"].state = gateOut.state;

                            let index = this.connections.findIndex(e => (e.connID == c.connID));
                            this.connections[index].state = gateOut.state;
                        }
                    }
                    else if(c.type == "in")
                    {
                        let gateInIndex = this.inConnections.findIndex(e => (e.ID == c.from && e.place == c.place));
                        if(this.inConnections[gateInIndex].state != c.state)
                        {
                            stable = false;
                        }
        
                        this.inConnections[gateInIndex].state = c.state;
                        let index = this.connections.findIndex(e => (e.connID == c.connID));
                        this.connections[index].state = c.state;
                    }
                    else if(c.type == "none")
                    {
                    }
                });
            counter++;
            });

            this.gates.forEach(gate =>{
                let inputs = this.inConnections.filter(e =>{ return e.ID == gate.ID;});
                let outputIndex = this.outConnections.findIndex(e => e.ID == gate.ID);
                let output = this.outConnections[outputIndex];
                
                //connection got deleted I think... maybe
                //or she went and got some milk 
                //since 3 years do you think she will come back...
                //
                //please...
                //come back... I need you(r) connection...
                for(let i = 0; i < inputs.length; i++)
                {
                    let temp = this.connectionTable.find(e =>((e.start.pos.x == inputs[i].pos.x && e.start.pos.y == inputs[i].pos.y) || (e.end.pos.x == inputs[i].pos.x && e.end.pos.y == inputs[i].pos.y)));
                    if(temp == undefined)
                    {
                        inputs[i].state = 2;
                        let inputIndex = this.inConnections.findIndex(e =>(e.ID == gate.ID && e.place == inputs[i].place));
                        this.inConnections[inputIndex].state = 2;
                    }
                }

                let handlerArr = [];

                inputs.forEach(i => { handlerArr.push((i.state==1 ? true : false));});

                let newState = gate.function(handlerArr, (output.state==1 ? true : false));
                newState = newState == true ? 1 : 0;

                if(newState != output.state)
                {
                    stable = false;
                }

                this.outConnections[outputIndex].state = newState;
            });
            endCounter++;
        }

        if(endCounter == 500)
        {
            console.log("overflow");
        }

        this.move(pos, false);
    }

    getGateInfo(ID)
    {
        let inConn = this.inConnections.filter(e => e.ID == ID);
        let outConn = this.outConnections.find(e => e.ID == ID);

        return{inConn: inConn, outConn: outConn};
    }
}