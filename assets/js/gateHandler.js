function handleAND(input, output)
{
    let ret = true;
    input.forEach(element => {
        ret = ret && element;
    });

    return ret;
}

function handleNAND(input, output)
{
    let ret = true;
    input.forEach(element => {
        ret = ret && element;
    });

    return !ret;
}

function handleNOT(input, output)
{
    let ret = true;
    input.forEach(element => {
        ret = ret && element;
    });

    return !ret;
}

function handleBUTTON(input, output)
{
    return output;
}

function handleOR(input, output)
{
    let ret = false;
    input.forEach(element => {
        if(element)
        {
            ret = true;
        }
    });

    return ret;
}