/**
 * Created by tanjiasheng on 2017/2/20.
 */

;(function () {
    function gMap(cfg) {
        var self = this;
        cfg = cfg || {};
        self.map = {};//地图实例
        self.elem = cfg.elem;//地图容器
        self.curPos = cfg.curPos;//当前坐标
        self.prods = cfg.prods || [];//传入产品信息参数
        self.type = cfg.type;//图标类型
        self.ctl = cfg.ctl;//是否需要控件
        self.curMark = {};//当前位置坐标实例
        self.prodsMark = [];//当前地图标记实例列表
        self.prodInfos = [];//当前信息窗口实例列表
        self.execArr = [];//代处理的任务队列

        if (window.google && window.google.maps) {
            self.drawMap.call(self);
        } else {
            window.addEventListener('load', function () {
                self.drawMap.call(self);
            });
        }
    }

    gMap.prototype = {
        //获取url参数工具方法
        getQuery: function (key) {
            var reg = new RegExp('(^|&)' + key + '=([^&]*)(?=&|$)', 'g'),
                res = window.location.search.substr(1).match(reg),
                rtArr = [];
            if (res != null) {
                res.forEach(function (o) {
                    rtArr.push(decodeURIComponent(o.split('=')[1]));
                });
                return rtArr;
            }
            return null;
        },

        //绘制当前位置方法
        drawCur: function (pos) {
            var self = this,
                map = self.map;

            self.curPos = self.curPos || pos;
            var posMark = {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#4687F4',
                fillOpacity: 1,
                scale: 6,
                strokeColor: 'white',
                strokeWeight: 2
            };
            var marker = new google.maps.Marker({
                position: pos,
                icon: posMark,
                zIndex: 99,
                map: map
            });
            this.curMark = marker;
        },

        //绘制定位当前位置方法
        drawCurBtn: function () {
            var self = this,
                map = self.map;
            var _div = document.createElement('div');
            _div.className = 'cur-btn';

            var circle = document.createElement('div');
            circle.className = 'cur-btn-cir';

            _div.appendChild(circle);
            _div.addEventListener('click', function () {
                map.panTo(self.curPos);
            });
            map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(_div);
        },

        //绘制产品位置
        drawProds: function (prods, addFlag) {
            var self = this,
                map = self.map,
                prodsMark = self.prodsMark,
                image = {};

            //尚未初始化完成，推入队列
            if (!(window.google && window.google.maps && self.map instanceof window.google.maps.Map)) {
                self.execArr.push({
                    data: prods
                });
                return;
            }

            //若已经存在产品标记，则去除之
            if (prodsMark.length > 0 && addFlag !== true) {
                prodsMark.forEach(function (p) {
                    p.setMap(null);
                });
                self.prodsMark = [];
                self.prodInfos = [];
                self.prods = [];
            }

            if (self.type == 1) {
                image = {
                    url: '../icons/map_info_small_bg.png',
                    scaledSize: new google.maps.Size(60, 25),
                    origin: new google.maps.Point(0, 0),
                    labelOrigin: new google.maps.Point(30, 10)
                };
            } else {
                image = {
                    url: '../icons/map_pop_icon.png',
                    origin: new google.maps.Point(0, 0),
                    scaledSize: new google.maps.Size(20, 25),
                };
            }

            prods.forEach(function (p, i) {
                var prod = new google.maps.Marker({
                    position: {lat: Number(p.lat), lng: Number(p.lng)},
                    map: map,
                    icon: image,
                    // label: markLabel,
                    animation: google.maps.Animation.DROP,
                    scale: 1,
                    // optimized: false,
                    zIndex: 100 + i
                });
                if(self.type == 1){
                    prod.setLabel({
                        text: '￥' + p.price + '起',
                        color: '#ffffff',
                        fontSize: '10px'
                    })
                }
                self.prodsMark.push(prod);
                var infowindow = new google.maps.InfoWindow({
                    content: '<div class="info-win" onclick="alert(\'' + p.toUrl + '\')">' +
                    '<img src="' + p.img + '" class="info-img">' +
                    '<span class="info-pname">' + p.pName + '</span>' +
                    '</div>'
                });
                self.prodInfos.push({
                    mark: prod,
                    info: infowindow,
                    orig: p
                });
                prod.addListener('click', function () {
                    self.prodInfos.forEach(function (i) {
                        if (i.mark !== prod) {
                            i.info.close();
                        }
                    });
                    infowindow.open(map, prod);
                });
            });
            self.prods.concat(prods);
            map.panTo({
                lat: Number(self.curPos.lat) || Number(self.prods[0].lat),
                lng: Number(self.curPos.lng) || Number(self.prods[0].lng)
            });
            map.setZoom(13)
        },

        //向地图添加产品标记
        addProd: function (prods) {
            this.drawProds(prods, true);
        },

        //开始绘制地图
        drawMap: function () {
            var self = this;
            self.map = new google.maps.Map(self.elem, {
                center: {
                    lat: Number(self.curPos.lat) || Number(self.prods[0].lat),
                    lng: Number(self.curPos.lng) || Number(self.prods[0].lng)
                },
                zoom: 13,
                disableDefaultUI: true,
                gestureHandling: 'greedy'
            });

            //标记当前位置
            if (self.curPos.lat && self.curPos.lng) {
                self.drawCur(self.curPos);
                //地图控件添加
                if (self.ctl) {
                    self.drawCurBtn();
                } else {
                    console.warn('定位经纬度数据有误');
                }
            }

            //标记产品位置
            if (self.prods) {
                self.drawProds(self.prods);
            }

            self.map.addListener('click', function () {
                self.prodInfos.forEach(function (p) {
                    p.info.close();
                })
            });

            //初始化完成，执行任务队列
            if (self.execArr.length > 0) {
                self.execArr.forEach(function (e) {
                    self.drawProds.call(self, e.data);
                });
            }
        },

        //展示产品信息标签
        showInfo: function (info) {
            var self = this,
                map = self.map,
                prodInfos = self.prodInfos;

            switch (typeof info) {
                case 'number':
                    prodInfos.forEach(function (p, i) {
                        if (i == info) {
                            p.info.open(map, p.mark);
                            map.panTo({lat: Number(p.orig.lat), lng: Number(p.orig.lng)})
                        } else {
                            p.info.close();
                        }
                    });
                    break;
                case 'string':
                    break;
                case 'object':
                    break;
                default:
                    break;
            }
        }
    };
    window.gMap = gMap;
})();