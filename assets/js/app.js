let canvas;
let ctx;

let grid;

// ======== MOVE ========
let pos = {x:0,y:0};

let inCanvasMove = false;
let oldMousPos = undefined;

// ======== PLACE ========
let inPlaceMode = false;
let inConnectMode = false;

let placePart = undefined;
let placePartFunction = undefined;
let selectedGate = undefined;

// ======== LABELS ========
let posXLabel, posYLabel;
let zoomLabel;

// ======== CONTEXT MENU ========
let contextMenu;
let contextOpen = false;

//
let placeMenu;
let buildMenu;

let buildMenuOpen = false;

// ======== INFO MENU ========
let infoContainer;
let infoContent;
let previewCanvas;
let previewGrid;

window.onload = function()
{
    canvas = document.getElementById("mainCanvas");
    previewCanvas = document.getElementById("preview-canvas-ID");

    infoContainer = document.getElementById("info-ID");
    infoContent = document.getElementById("info-content-ID");

    posYLabel = document.getElementById("posY-label-ID");
    posXLabel = document.getElementById("posX-label-ID");

    zoomLabel = document.getElementById("zoom-label-ID");
    zoomLabel.innerHTML = "1.4";

    placeMenu = document.getElementById("placeMenu");
    buildMenu = document.getElementById("buildMenu");

    contextMenu = document.getElementById("contextMenu-ID");

    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
      }, false);

    placeMenu.addEventListener("click", function(){
        if(!buildMenuOpen)
        {
            //buildMenu.setAttribute("style", "transform:translateX(0%);");
            buildMenu.setAttribute("style", "left:15px;");
        }
        else
        {
            buildMenu.setAttribute("style", "left:-200px;");
        }

        buildMenuOpen = !buildMenuOpen;
    });

    canvas.width = document.documentElement.clientWidth;
    canvas.height = document.documentElement.clientHeight;

    ctx = canvas.getContext("2d");

    grid = new Grid(ctx, canvas.width, canvas.height, "black");
    grid.initGrid(pos, "white");

    let pCtx = previewCanvas.getContext("2d");
    previewGrid = new Grid(pCtx, previewCanvas.width, previewCanvas.height, "white");
    previewGrid.initGrid({x: 0, y:0});

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("mouseup", mouseUp);

    canvas.addEventListener("wheel", scroll);
}

function closeMenu()
{

    buildMenu.setAttribute("style", "left:-200px;");
    buildMenuOpen = false;
}

function placeGate(gate)
{
    switch(gate)
    {
        case "AND":
            inPlaceMode = true;
            placePart = andGate;
            placePartFunction = handleAND;
            break;
        case "NAND":
            inPlaceMode = true;
            placePart = nandGate;
            placePartFunction = handleNAND;
            break;
        case "OR":
            inPlaceMode = true;
            placePart = orGate;
            placePartFunction = handleOR;
            break;
        case "NOT":
            inPlaceMode = true;
            placePart = notGate;
            placePartFunction = handleNOT;
            break;
        default:
            inPlaceMode = false;
            break;
    }

    closeMenu();
}

function openInfo()
{
    if(selectedGate != undefined)
    {
        previewGrid.connections = [];
        previewGrid.gates = [];
        if(selectedGate.type != "connection")
        {
            let gateInfo = grid.getGateInfo(selectedGate.ID);

            infoContent.innerHTML = "<h2>"+selectedGate.name+"</h2><span>Type: "+selectedGate.type+"</span><span>ID: "+selectedGate.ID+"</span><span>In Connections: "+selectedGate.in+"</span><span>Out Connections: "+selectedGate.out+"</span>";
            
            let connectionPreview = document.createElement("div");
            connectionPreview.classList.add("connection-Preview");

            let connectionPreviewOut = document.createElement("div");
            connectionPreviewOut.classList.add("connection-Preview");

            let previewInConn = [];

            let counter = 3;
            gateInfo.inConn.forEach(element => {
                let cssClass = "no";
                let word = "NO CONNECTION";

                if(element.state == 0)
                {
                    cssClass = "low";
                    word = "LOW";
                }
                else if(element.state == 1)
                {
                    cssClass = "high";
                    word = "HIGH";
                }

                let tempConn = [];
                for(let i = 0; i < 2; i++)
                {
                    tempConn[counter+"-"+i] = {pos:{x:i, y:counter}, dir: "w", order: i};
                }

                previewGrid.connections.push({conn: tempConn, state: element.state});

                console.log(tempConn);

                let item = document.createElement("div");
                item.classList.add("connection-Preview-item");

                let span = document.createElement("span");
                span.classList.add(cssClass);

                item.innerHTML = "IN "+element.place+" - ";
                span.innerHTML = word;

                item.appendChild(span);
                connectionPreview.appendChild(item);

                counter++;
            });

            let cssClass = "no";
            let word = "NO CONNECTION";

            if(gateInfo.outConn.state == 0)
            {
                cssClass = "low";
                word = "LOW";
            }
            else if(gateInfo.outConn.state == 1)
            {
                cssClass = "high";
                word = "HIGH";
            }

            counter = 3;
            let tempConn = [];
            for(let i = 2+selectedGate.size.w; i < 12; i++)
            {
                tempConn[counter+"-"+i] = {pos:{x:i, y:counter}, dir: "w", order: i};
            }

            previewGrid.connections.push({conn: tempConn, state: gateInfo.outConn.state});

            let item = document.createElement("div");
            item.classList.add("connection-Preview-item");

            let span = document.createElement("span");
            span.classList.add(cssClass);

            item.innerHTML = "OUT "+gateInfo.outConn.place+" - ";
            span.innerHTML = word;

            item.appendChild(span);
            connectionPreviewOut.appendChild(item);

            infoContent.appendChild(connectionPreview);
            infoContent.appendChild(connectionPreviewOut);

            selectedGate.pos = {x:2, y:3};
            previewGrid.gates.push(selectedGate);
            previewGrid.move({x:0, y:0}, false);
        }

        infoContainer.style.display = "grid";
    }

    selectedGate = undefined;
    contextMenu.style.display = "none";
    contextOpen = !contextOpen;
}

function deleteGate()
{
    if(selectedGate != undefined)
    {
        if(selectedGate.type != "connection")
        {
            grid.deleteGate(pos, selectedGate.ID);
        }
        else
        {
            grid.deleteConnection(pos, selectedGate.ID);
        }

        selectedGate = undefined;
        contextMenu.style.display = "none";
        contextOpen = !contextOpen;
    }
}

function placeInput(input)
{
    switch(input)
    {
        case "BUTTON":
            inPlaceMode = true;
            placePart = buttonGate;
            placePartFunction = handleBUTTON;
            break;
        case "HIGH":
            inPlaceMode = true;
            placePart = buttonGate;
            placePartFunction = handleBUTTON;
            break;
        default:
            inPlaceMode = false;
            break;
    }

    closeMenu();
}

function mouseDown(e)
{
    if(e.button == 0){
        if(!inPlaceMode)
        {
            if(e.ctrlKey)
            {
                inConnectMode = true;
                let canvasMousePos = getMousePos(e);
                grid.showConnection(pos, grid.getCellPos(canvasMousePos, pos));
            }
            else if(e.shiftKey)
            {
                inCanvasMove = true;
                oldMousPos = {x: e.clientX, y: e.clientY};
            }
            else
            {
                let canvasMousePos = getMousePos(e);
                grid.handleClick(pos, grid.getCellPos(canvasMousePos, pos));
            }
        }
    }
    else if(e.button == 2)
    {
        if(!contextOpen)
        {
            let canvasMousePos = getMousePos(e);
            let selected = grid.openContextMenu(pos, grid.getCellPos(canvasMousePos, pos));
            selectedGate = selected;
            if(selected)
            {
                let top = e.clientY;
                let left = e.clientX;
    
                if(top+130 > canvas.height)
                {
                    top -=130;
                }
    
                if(left+275 > canvas.width)
                {
                    left -=275;
                }
    
                contextMenu.style.display = "block";
                contextMenu.style.top  = top+"px";
                contextMenu.style.left = left+"px";
                contextOpen = !contextOpen;

                contextMenu.querySelector(".header").innerHTML =selected.name+"<span CLASS = 'id'> #"+selected.ID+"</span>";
            }
        }
        else
        {
            selectedGate = undefined;
            contextMenu.style.display = "none";
            contextOpen = !contextOpen;
        }
    }
}

function mouseMove(e)
{
    if(inPlaceMode)
    {
        let canvasMousePos = getMousePos(e);
        grid.showBluePrint(pos, grid.getCellPos(canvasMousePos, pos), placePart, placePartFunction);
    }
    else if(inConnectMode)
    {
        inConnectMode = true;
        let canvasMousePos = getMousePos(e);
        grid.showConnection(pos, grid.getCellPos(canvasMousePos, pos));
    }
    else if(inCanvasMove)
    {
        if(oldMousPos != undefined)
        {
            let diffX = e.clientX - oldMousPos.x;
            let diffY = e.clientY - oldMousPos.y;

            oldMousPos.x = e.clientX;
            oldMousPos.y = e.clientY

            pos.x += diffX;
            pos.y += diffY;

            if(diffX > 0 && pos.x > 0)
            {
                pos.x = 0;
            }

            if(diffY > 0 && pos.y > 0)
            {
                pos.y = 0;
            }

            grid.move(pos, diffX, diffY, false);

            posYLabel.innerHTML = pos.y;
            posXLabel.innerHTML = pos.x;
        }
    }
}

function mouseUp(e)
{
    if(inPlaceMode)
    {
        let canvasMousePos = getMousePos(e);
        grid.showBluePrint(pos, grid.getCellPos(canvasMousePos, pos), placePart,placePartFunction,true);
        inPlaceMode = false;
    }
    else if(inConnectMode)
    {
        let canvasMousePos = getMousePos(e);
        grid.showConnection(pos, grid.getCellPos(canvasMousePos, pos), true);
        inPlaceMode = false;
        inConnectMode = false;
    }
    else
    {
        inCanvasMove = false;
    }
}

function scroll(e)
{
    let zoom = 0;
    if(e.deltaY < 0)
    {
        zoom +=0.1;
    }
    else
    {
        zoom -=0.1;
    }

    zoomLabel.innerHTML = grid.betterZoom(zoom, pos);
}

function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }