/*
 * custom jquery
 */
 
/*
 * select
 */
$(document).ready(function() {
	//select all links href'ng '#'. 
	$('a[href*="#"]').each(function() { 
		//check if link points to the same page.
		if ((location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'')) && (location.hostname == this.hostname) && (this.hash.replace(/#/,'') )) {
			var $targetId = $(this.hash), $targetAnchor = $('[name=' + this.hash.slice(1) +']');
			var $target = $targetId.length ? $targetId : $targetAnchor.length ? $targetAnchor : false;
			if ($target) {
				var targetOffset = $target.offset().top;
				$(this).click(function() {
					//deactivate current active link.
					$("#nav li a").removeClass("active");
					//make this link the active link.
					$(this).addClass('active');
					//scroll to the target over X ms.
					/*
					 * 1000ms -> 'tutorial speed'
					 * 200ms  -> 'fast'
					 * 600ms  -> 'slow'
					 * 400ms  -> 'default'
					 */
					$('html, body').animate({scrollTop: targetOffset}, 1000);
					return false;
				});
			}
		}
	});

});