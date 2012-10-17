
var Piwik_Insight_FollowingPages = (function() {
	
	/** jQuery */
	var $ = jQuery;
	
	/** Info about the following pages */
	var followingPages = [];
	
	/** Reference to create element function */
	var c;
	
	/** Load the following pages */
	function load(callback) {
		// normalize current location
		var location = window.location.href;
		location = Piwik_Insight_UrlNormalizer.normalize(location);
		location = (("https:" == document.location.protocol) ? 'https' : 'http') + '://' + location;
		
		// load following pages
		Piwik_Insight_Client.api('getFollowingPages', function(data) {
			followingPages = data;
			followingPages = normalize(followingPages);
			callback();
		}, 'url=' + escape(location));
	}
	
	/** Normalize the URLs of following pages */
	function normalize(original) {
		var normalized = [];
		var urlIndexMap = {};
		for (var i = 0; i < original.length; i++) {
			var url = Piwik_Insight_UrlNormalizer.normalize(original[i].url);
			if (typeof urlIndexMap[url] == 'undefined') {
				var index = normalized.length;
				urlIndexMap[url] = index;
				original[i].url = url;
				normalized.push(original[i]);
			}
			else {
				var index = urlIndexMap[url];
				var record = normalized[index];
				record.clicks += original[i].clicks;
				record.clickRate += original[i].clickRate;
			}
		}
		return normalized;
	}
	
	/** Add click rates to links */
	function build(callback) {
		var body = $('body');
		
		// build an index of all links on the page
		var links = {};
		$('a:visible').each(function() {
			var a = $(this);
			var href = a.attr('href');
			href = Piwik_Insight_UrlNormalizer.normalize(href);
			if (href) {
				if (typeof links[href] == 'undefined') {
					links[href] = [a];
				}
				else {
					links[href].push(a);
				}
			}
		});
		
		// add tags to known following pages
		var linkTags = [];
		for (var i = 0; i < followingPages.length; i++) {
			var url = followingPages[i].url;
			if (typeof links[url] != 'undefined') {
				for (var j = 0; j < links[url].length; j++) {
					linkTags.push(createLinkTag(links[url][j], followingPages[i], body));
				}
			}
		}
		
		positionLinkTags(linkTags);
		
		callback();
		
		// repsition linktags on window resize
		var timeout = false;
		$(window).resize(function() {
			if (timeout) {
				window.clearTimeout(timeout);
			}
			timeout = window.setTimeout(function() {
				positionLinkTags(linkTags);
			}, 70);
		});
	}
	
	/** Create the link tag element. Returns array [linkElement, tagElement] */
	function createLinkTag(link, followingPage, body) {
		var rate = followingPage.clickRate;
		if (rate < 10) {
			rate = Math.round(rate * 10) / 10;
		} else {
			rate = Math.round(rate);
		}
		
		var span = c('span').html(rate + '%');
		var tag = c('div', 'LinkTag').append(span).hide();
		body.prepend(tag);
		return [link, tag];
	}
	
	/** Position the link tags next to the links */
	function positionLinkTags(linkTags) {
		var link, tag, offset, top, left, isRight;
		var tagWidth = 36, tagHeight = 21;
		
		for (var i = 0; i < linkTags.length; i++) {
			link = linkTags[i][0];
			tag = linkTags[i][1];
			offset = link.offset();
			
			top = offset.top - tagHeight + 6;
			left = offset.left - tagWidth + 10;
			
			if (isRight = (left < 2)) {
				tag.addClass('PIS_Right');
				left = offset.left + link.outerWidth() - 10;
			}
			
			if (top < 2) {
				tag.addClass(isRight ? 'PIS_BottomRight' : 'PIS_Bottom');
				top = offset.top + link.outerHeight() - 6;
			}
			
			tag.css({
				top: top + 'px',
				left: left + 'px'
			}).show();
		}
	}
	
	return {
		
		initialize: function(urls, finishCallback) {
			c = Piwik_Insight_Client.createElement;
			
			Piwik_Insight_Client.loadScript('plugins/Insight/client/urlnormalizer.js', function() {
				Piwik_Insight_UrlNormalizer.initialize(urls);
				load(function() {
					build(function() {
						finishCallback();
					})
				});
			});
		}
		
	};
	
})();