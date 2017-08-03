/**
 * b.tabs.js
 * base on Bootstrap Tab
 * 
 * 导航功能扩展，可动态添加，可关闭
 * 使用后可将系统改造为以标签页来打开页面的模式
 * 
 * @author Terry
 * created : 2016.03.17
 * 
 * changelog:
 * 2017.07.21 - 重构代码
 *              解决IE下关闭标签页后切换其它标签页不能获得焦点问题
 * 2017.08.03 - 增加内部高度修正功能
 *              增加标签拖拽功能（依赖jquery-ui功能库，需要引入脚本）
 *              修复部分Bug
 */
!function ($) {
	"use strict";
	
	var defaults = {
		/**
		 * 载入标签页内容，登录超时后跳转的链接
		 */
		'loginUrl' : '/',
		/**
		 * 自定义样式
		 */
		'className' : undefined,
		/**
		 * 是否允许标签被拖拽排序，默认允许
		 * 拖拽功能依赖jquery-ui脚本库，请在使用之前引入功能库
		 * 设置“noSort”样式可以让标签不被排序
		 */
		'sortable' : true,
		/**
		 * 浏览窗口尺寸发生变化时执行的回调
		 */
		'resize' : undefined
	};
	
	/**
	 * 常量
	 */
	var constants = {
		closeBtnTemplate : '<button type="button" class="navTabsCloseBtn" title="关闭" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>',
		//设置该样式的tab不会被关闭
		noCloseClass : 'noclose',
		//设置该样式不会被拖拽修改位置
		noSortClass : 'noSort',
		prefixKey : 'bTabs_'
	};
	
	var bTabs = function(box,p){
		this.$container = box;
		this.openTabs = new Array();
		this.p = p;
	};
	/**
	 * 版本
	 */
	bTabs.version = '1.0';
	/**
	 * 初始化
	 */
	bTabs.prototype.init = function(){
		var self = this,c = constants, $tabs = this.$container, openTabs = this.openTabs, p = this.p;
		
		$($tabs).addClass('bTabs');
		if(p.className) $($tabs).addClass(p.className);
		
		$('ul.nav-tabs a',$($tabs)).each(function(i,row){
			var li = $(this).closest('li');
			if(li && !$(li).hasClass(c.noCloseClass)) $(row).append(c.closeBtnTemplate);
		});
		$('div.tab-content div.tab-pane',$tabs).each(function(i,row){
			openTabs.push($(this).attr('id'));
		});
		//为关闭图标绑定事件，并适用于动态新增的
		$('ul.nav-tabs',$tabs).on('click','button',function(e){
			var id = $(this).parent().attr('href').replace('#', '');
			self.closeTab(id);
		});
		//处理窗口拖拽排序功能
		if(p.sortable && $.fn.sortable){
			$('ul.nav-tabs',$tabs).sortable({
				items : "li:not(."+c.noSortClass+")",
				cancel : "li:not(.active)",
				axis : "x",
				placeholder : 'bTabsPlaceHolder',
				forcePlaceholderSize : true,
				stop : function(e,ui){}
			}).disableSelection();
		}
		if(p && p.resize && $.isFunction(p.resize)){
			p.resize();
			self.innerResize();
			$(window).off('resize.bTabs').on('resize.bTabs',function(e){
				p.resize();
				self.innerResize();
			});
		}
	};
	/**
	 * 内部高度调整
	 */
	bTabs.prototype.innerResize = function(){
		var $tabs = this.$container;
		//高度计算
		var mainHeight = $($tabs).innerHeight();
		var tabBarHeight = $('ul.nav-tabs',$tabs).outerHeight(true);
		$('div.tab-content',$tabs).height(mainHeight - tabBarHeight);
	};
	/**
	 * 新增一个tab，但如果是已存在的tab则只是激活它，而不再新增
	 * 
	 * @param id {string} 模块ID 
	 * @param title {string} 标题
	 * @param url {string} 目标链接地址
	 * @param loginCheck {function}可选参数，不传则直接使用iframe打开界面
	 */
	bTabs.prototype.addTab = function(id,title,url,loginCheck){
		if(!id || !title || !url) console.error('新增tab时，id,title,url参数为必须传递参数！');
		var c = constants, $tabs = this.$container, openTabs = this.openTabs, p = this.p;
		var tabId = c.prefixKey + id;
		if(openTabs && $.isArray(openTabs) && openTabs.length>0){
			var exist = false;//是否已存在
			$.each(openTabs,function(i,row){
				if(row == tabId){
					exist = true;
					return false;
				}
			});
			//若功能已存在，则直接切换
			if(exist){
				$('ul.nav-tabs a[href="#'+tabId+'"]',$tabs).tab('show');
				return;
			}
		}else openTabs = new Array();
		$('ul.nav-tabs',$tabs).append('<li><a href="#'+tabId+'" data-toggle="tab">'+title+c.closeBtnTemplate+'</a></li>');
		var content = $('<div class="tab-pane" id="'+tabId+'"></div>');
		$('div.tab-content',$tabs).append(content);
		//切换到新增加的tab上
		$('ul.nav-tabs li:last a',$tabs).tab('show');
		openTabs.push(tabId);
		
		var openIframe = function(){
			$(content).append('<iframe frameborder="0" scrolling="yes" style="width:100%;height:100%;border:0px;" src="'+url+'"></iframe>');
		};
		//进行登录验证
		if(loginCheck && $.isFunction(loginCheck)){
			if(loginCheck()) openIframe();
			else if(p && p.loginUrl) window.top.location.replace(p.loginUrl);
		}else openIframe();
	};
	/**
	 * 关闭tab
	 * @param id
	 */
	bTabs.prototype.closeTab = function(id){
		var c = constants, $tabs = this.$container, openTabs = this.openTabs;
		var thisTab = $('#' + id);
		//在移除标签页之前，先把iframe移除，解决在IE下，窗口上的输入控件获得不了焦点的问题
		if($('iframe',$(thisTab)).size() > 0) $('iframe',$(thisTab)).remove();
		//移除内容区
		$(thisTab).remove();
		var a = $('ul.nav-tabs a[href="#'+id+'"]',$tabs);
		var li = $(a).closest('li');
		//获得当前tab的前一个tab
		var prevLi = $(li).prev();
		//移除Tab
		li.remove();
		if(openTabs && $.isArray(openTabs) && openTabs.length>0){
			var index = -1;
			$.each(openTabs,function(i,d){
				if(d == id){
					index = i;
					return false;
				}
			});
			if(index != -1) openTabs.splice(index,1);
		}
		//激活被关闭Tab邻的Tab，若没有则不处理
		if(prevLi.size() > 0 ) $('a',$(prevLi)).tab('show');
	};
	
	/**
	 * 插件初始化入口
	 */
	function Plugin(p){
		return this.each(function(){
			//参数合并时允许读取在html元素上定义的'data-'系列的参数
			var $this = $(this),
				data = $this.data('bTabs'),
				params = $.extend({}, defaults, $this.data(), typeof p == 'object' && p);
			if(!data) $this.data('bTabs', (data = new bTabs(this,params)));
			data.init();
		});
	}
	
	/**
	 * 新增标签页
	 */
	function bTabsAdd(id,title,url,loginCheck){
		return this.each(function(){
			if(!id || !title || !url) return;
			var $this = $(this),data = $this.data('bTabs');
			if(data) data.addTab(id,title,url,loginCheck);
		});
	}
	/**
	 * 关闭标签页
	 */
	function bTabsClose(id){
		return this.each(function(){
			if(!id || !title || !url) return;
			var $this = $(this),data = $this.data('bTabs');
			if(data) data.closeTab(id);
		});
	}
	
	var old = $.fn.bTabs;

	$.fn.bTabs             = Plugin;
	$.fn.bTabs.Constructor = bTabs;
	$.fn.bTabsAdd          = bTabsAdd;
	$.fn.bTabsClose        = bTabsClose;
	
	// 处理新旧版本冲突
	// =================
	$.fn.bTabs.noConflict = function () {
		$.fn.bTabs = old;
		return this;
	};
}(window.jQuery);