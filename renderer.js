const {ipcRenderer} = require('electron')
window.$ = window.jQuery = require('jquery');
require('bootstrap')
require('admin-lte')

//$('[data-toggle="tooltip"]').tooltip()

//{{ 最大化响应，根据当前窗口状态更改对应icon
ipcRenderer.on('maximize', (event, args)=>{
  if(args === 'true'){
    $('[data-control="maximize"] i').removeClass('fa-maximize').addClass('fa-window-restore')
  }else{
    $('[data-control="maximize"] i').removeClass('fa-window-restore').addClass('fa-maximize')
  }
})
//}}



//{{ 左侧菜单响应
$('.sidebar-menu li a').click(function(){
  $('.sidebar-menu li').removeClass('active')
  $(this).parent().addClass('active')
  let url = $(this).attr('href')
  $.get(url,(response)=>{
    $('#mainContent').html(response)
  })
  return false
})
//}}

// 默认页面加载
$('.default-page').trigger('click')

//{{ 系统按钮：关闭，最大化，最小化
$('[data-control="close"] a').click(function(){
  ipcRenderer.send('close', 'true')
})
$('[data-control="maximize"] a').click(function(){
  ipcRenderer.send('maximize', 'true')
  $(this).blur()
})
$('[data-control="minimize"] a').click(function(){
  ipcRenderer.send('minimize', 'true')
  $(this).blur()
})
//}}

function getPrefix(prefixIndex) {
  var span = '    ';
  var output = [];
  for (var i = 0; i < prefixIndex; ++i) {
      output.push(span);
  }

  return output.join('');
}


//{{ jquery 扩展方法

let fnExt = {
  //{{ 加载等待动画
  showLoading: function (text){
    let div = '<div class="overlay" id="_loading"><i class="fa fa-refresh fa-spin"></i> <span>'+text+'</span></div>';
    $('#mainContent').append(div)
  },
  hideLoading: function (){
    $('#_loading').remove()
  },
  //}}

  formatJSON: function(json, options){
    var reg = null,
    formatted = '',
    pad = 0,
    PADDING = '    ';
    options = options || {};
    options.newlineAfterColonIfBeforeBraceOrBracket = (options.newlineAfterColonIfBeforeBraceOrBracket === true) ? true : false;
    options.spaceAfterColon = (options.spaceAfterColon === false) ? false : true;
    if (typeof json !== 'string') {
      json = JSON.stringify(json);
    } else {
      json = JSON.parse(json);
      json = JSON.stringify(json);
    }
    reg = /([\{\}])/g;
    json = json.replace(reg, '\r\n$1\r\n');
    reg = /([\[\]])/g;
    json = json.replace(reg, '\r\n$1\r\n');
    reg = /(\,)/g;
    json = json.replace(reg, '$1\r\n');
    reg = /(\r\n\r\n)/g;
    json = json.replace(reg, '\r\n');
    reg = /\r\n\,/g;
    json = json.replace(reg, ',');
    if (!options.newlineAfterColonIfBeforeBraceOrBracket) {
      reg = /\:\r\n\{/g;
      json = json.replace(reg, ':{');
      reg = /\:\r\n\[/g;
      json = json.replace(reg, ':[');
    }
    if (options.spaceAfterColon) {
      reg = /\:/g;
      json = json.replace(reg, ':');
    }
    (json.split('\r\n')).forEach(function (node, index) {
            var i = 0,
                    indent = 0,
                    padding = '';

            if (node.match(/\{$/) || node.match(/\[$/)) {
                indent = 1;
            } else if (node.match(/\}/) || node.match(/\]/)) {
                if (pad !== 0) {
                    pad -= 1;
                }
            } else {
                indent = 0;
            }

            for (i = 0; i < pad; i++) {
                padding += PADDING;
            }

            formatted += padding + node + '\r\n';
            pad += indent;
        }
    );
    return formatted;
  },
  formatXML(text){
    //去掉多余的空格
    text = '\n' + text.replace(/(<\w+)(\s.*?>)/g, function ($0, name, props) {
      return name + ' ' + props.replace(/\s+(\w+=)/g, " $1");
    }).replace(/>\s*?</g, ">\n<");

    //把注释编码
    text = text.replace(/\n/g, '\r').replace(/<!--(.+?)-->/g, function ($0, text) {
    var ret = '<!--' + escape(text) + '-->';
    //alert(ret);
    return ret;
    }).replace(/\r/g, '\n');

    //调整格式
    var rgx = /\n(<(([^\?]).+?)(?:\s|\s*?>|\s*?(\/)>)(?:.*?(?:(?:(\/)>)|(?:<(\/)\2>)))?)/mg;
    var nodeStack = [];
    var output = text.replace(rgx, function ($0, all, name, isBegin, isCloseFull1, isCloseFull2, isFull1, isFull2) {
    var isClosed = (isCloseFull1 == '/') || (isCloseFull2 == '/' ) || (isFull1 == '/') || (isFull2 == '/');
      //alert([all,isClosed].join('='));
      var prefix = '';
      if (isBegin == '!') {
        prefix = getPrefix(nodeStack.length);
      }
      else {
      if (isBegin != '/') {
        prefix = getPrefix(nodeStack.length);
        if (!isClosed) {
            nodeStack.push(name);
        }
      }
      else {
        nodeStack.pop();
        prefix = getPrefix(nodeStack.length);
      }

      }
      var ret = '\n' + prefix + all;
      return ret;
    });

    var prefixSpace = -1;
    var outputText = output.substring(1);
    //alert(outputText);

    //把注释还原并解码，调格式
    outputText = outputText.replace(/\n/g, '\r').replace(/(\s*)<!--(.+?)-->/g, function ($0, prefix, text) {
    //alert(['[',prefix,']=',prefix.length].join(''));
    if (prefix.charAt(0) == '\r')
      prefix = prefix.substring(1);
      text = unescape(text).replace(/\r/g, '\n');
      var ret = '\n' + prefix + '<!--' + text.replace(/^\s*/mg, prefix) + '-->';
    //alert(ret);
      return ret;
    });

    return outputText.replace(/\s+$/g, '').replace(/\r/g, '\r\n');
  }
}
$.extend(fnExt)

// 元素扩展方法
let ext = {
    // 编辑
    canEdit: function (options, callback) {
        // 默认配置项
		let _default_options = {
			// 默认编辑框样式
			input_class: ''
		};

		// 处理参数
		if(typeof options == 'object'){
			options = $.extend(false, _default_options, options);
		}else if(typeof options == 'function'){
			callback = options;
		}else{
			options = _default_options;
        }
        
        $('body').on('click', '.canEdit', function(){
            if($(this).hasClass('editing')) return
            $(this).addClass('editing')
            let pThis = this;
            let oldValue = $(this).text()
            
            let _input = document.createElement('input')
            $(_input).addClass(options.input_class)
            $(_input).val(oldValue)

            $(this).html(_input)

            $(_input).trigger('focus')
            $(_input).one('blur', function () {
				let _this = this;
				let value = $(_this).val();
                $(_this).remove()
                $(pThis).html(value)
                $(pThis).removeClass('editing')
                if(typeof callback === 'function'){
                    callback(value, pThis)
                }
            });            
            // 监听按下回车事件
			$(_input).on('keypress', function (event) {
				if(event.key == 'Enter'){
					$(this).trigger('blur');
				}
			});
            
        })
    }
}
$.fn.extend(ext);
//}}