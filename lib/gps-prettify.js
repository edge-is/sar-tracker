
var gpsPrettify = function (cordsArray){

  var lat = cordsArray[0];
  var lon = cordsArray[1];


  var latParsed = gpsParse(lat);
  var lonParsed = gpsParse(lon);


  var latDirection =  (lat.toString().charAt(0) === "-") ? "S" : "N";

  var lonDirection =  (lon.toString().charAt(0) === "-") ? "W" : "A";

  latParsed.reverse().push(latDirection);
  lonParsed.reverse().push(lonDirection);

  return [
      latParsed.reverse(), lonParsed.reverse()
  ]


  function gpsParse(pos){

    if (pos < 0) {
      pos = pos * -1;
    }

    var deg = pos.toFixed(0);

    var min = ((pos % 1) * 60);
    var sec = Math.floor(((min % 1) * 1000));

    min = Math.floor(min);

    min = zeroPadd(min, 2);
    sec = zeroPadd(sec, 3);

    return [
      deg, min, sec
    ]
  }

  function zeroPadd(numb, len){

    var str = numb.toString();
    var strLen = str.length;

    var diff = len - strLen;

    var padding = "";


    for (var i = 0; i < diff; i ++ ){
      padding +="0";
    }

    return [padding , str].join('');

  }


}



var x = gpsPrettify([
  64.123483344,
  -21.989997799999999

])

console.log(x)
