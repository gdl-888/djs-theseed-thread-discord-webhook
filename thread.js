const fs = require('fs');
const DJS11 = require('djs11');
const client = new DJS11.WebhookClient('웹후크 ID 번호', fs.readFileSync('./token_namu.txt') + '');
const http = require('https');
const md5 = require('md5');
require('tls').DEFAULT_MIN_VERSION = 'TLSv1';
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

function theseedRequest(host, path) {
    return new Promise((resolve, reject) => {
        http.request({
            host,
            path,
        }, res => {
            try {
                var ret = '';

                res.on('data', chunk => ret += chunk);

                res.on('end', () => {
                    const is = ret.match(/<script>window[.]INITIAL_STATE[=](((?!<\/script>).)*)<\/script>/)[1];
                    resolve(JSON.parse(is));
                });
            } catch(e) {
                reject(e);
            }
        }).end();
    });
}

function discussPoll(host, slug) {
	return new Promise((resolve, reject) => {
		theseedRequest(host, '/thread/' + slug).then(initjson => {
			var config = initjson;
			
			for(cfg_1 in config) {
				if(typeof config[cfg_1] != 'object') continue;
				for(cfg_2 in config[cfg_1]) {
					if(typeof config[cfg_1][cfg_2] != 'object') continue;
					for(cfg_3 in config[cfg_1][cfg_2]) {
						if(typeof config[cfg_1][cfg_2][cfg_3] != 'object' || !((config[cfg_1][cfg_2][cfg_3]) instanceof Array)) continue;

						var resdata = config[cfg_1][cfg_2][cfg_3];
						if(!resdata.length) continue;
						var chk = 1;
						for(item of resdata) {
							if(typeof item != 'object' || Object.keys(item).length != 2) {
								chk = 0; break;
							}
						}
						if(!chk) continue;

						var cnt = resdata.length;
						resolve(cnt); return;
					}
				}
			}
	
			reject(-1);
		});
	});
}

function discussFetch(host, slug, id) {
	id = String(id);
	
	return new Promise((resolve, reject) => {
		theseedRequest(host, '/thread/' + slug + '/' + id).then(initjson => {
			var config = initjson;
			
			for(cfg_1 in config) {
				if(typeof config[cfg_1] != 'object') continue;
				for(cfg_2 in config[cfg_1]) {
					if(typeof config[cfg_1][cfg_2] != 'object') continue;
					for(cfg_3 in config[cfg_1][cfg_2]) {
						if(typeof config[cfg_1][cfg_2][cfg_3] != 'object' || !((config[cfg_1][cfg_2][cfg_3]) instanceof Array)) continue;

						var resdata = config[cfg_1][cfg_2][cfg_3];
						if(!resdata.length) continue;
						var chk = 1;
						for(item of resdata) {
							if(typeof item != 'object' || Object.keys(item).length != 9) {
								chk = 0; break;
							}
						}
						if(!chk) continue;
						
						var fi = resdata[0][Object.keys(resdata[0])[2]];
						var fu = resdata[0][Object.keys(resdata[0])[1]];
						
						for(item of resdata) {
							var ret = [];
							for(p in item) ret.push(item[p]);
							
							var usr = '';
							if(ret[2]) {
								usr = '<a ' + (ret[7] ? 'style="font-weight: 700;"' : '') + ' href="/contribution/ip/' + ret[2] + '/document">' + ret[2] + '</a>';
							} else {
								usr = '<a ' + (ret[7] ? 'style="font-weight: 700;"' : '') + ' href="/w/사용자:' + ret[1] + '">' + ret[1] + '</a>';
							}
							
							if(typeof(ret[8]) == 'string' && ret[8].includes('line-through')) {
								if(ret[2]) usr += ' <sub>(차단된 아이피)</sub>';
								else usr += ' <sub>(차단된 사용자)</sub>';
							}
							
							var restyp = 'normal';
							var cntnt  = ret[3];
							
							if(ret[6] != 'normal') {
								restyp = 'status';
								switch(ret[6]) {
									case 'status':
										cntnt = '스레드 상태를 <strong>' + ret[3] + '</strong>로 변경';
									break; case 'document':
										cntnt = '스레드를 <strong>' + ret[3] + '</strong> 문서로 이동';
									break; case 'topic':
										cntnt = '스레드 주제를 <strong>' + ret[3] + '</strong>로 변경';
								}
							}
							
							if(ret[5]) {
								cntnt = '[' + ret[5] + '에 의해 숨겨진 글입니다.]';
								if(ret[3]) cntnt += '<div class=text-line-break style="margin: 25px 0 0 -10px;"><a class=text onclick="$(this).parent().parent().find(\'> .hidden-content\').show(); $(this).parent().css(\'margin\', \'15px 0 15px -10px\'); $(this).hide();" style="display: block; color: white;">[ADMIN] Show hidden content</a><div class=line></div></div><div class=hidden-content style="display: none;">' + (ret[3] || '내용을 불러올 수 없습니다!') + '</div>';
							}
							
							hidebtn = '';
							
							if(ret[5] && ret[3] !== null) {
								hidebtn = `<div class="combo admin-menu">
												<a class="btn btn-danger btn-sm" href="/admin/thread/${topic}/${ret[0]}/${ret[5] ? 'show' : 'hide'}">[ADMIN] 숨기기${ret[5] ? ' 해제' : ''}</a>
											</div>`;
							}
							
							if(ret[0] == id) {
								return resolve({
									type: ret[6],
									first_author: (fi == ret[2] && fi) || (fu == ret[1] && fu),
									id: ret[0],
									author: ret[1],
									ip: ret[2],
									suspended: ret[7],
									hider: ret[5] || null,
									content: ret[3],
								});
							}
						}
					}
				}
			}
		});
	});
}

var current = 0;

discussPoll('awiki.theseed.io', 'ChillyAwareCalmIcicle').then(cnt => {
	current = cnt;
	
	setInterval(() => {
		discussPoll('awiki.theseed.io', 'ChillyAwareCalmIcicle').then(cnt => {
			console.log('댓글', cnt);
			
			if(cnt > current) {
				current = cnt;
				discussFetch('awiki.theseed.io', 'ChillyAwareCalmIcicle', cnt).then(res => {
					client.send(res.content.replace(/<(((?!>).)*)>/g, ''), {
						username: (res.author || (res.ip.replace(/[.]\d{1,3}[.]\d{1,3}$/, '.**.**') + ' (IP)')) + (res.suspended ? '[차단된 사용자]' : ''),
						avatarURL: 'https://secure.gravatar.com/avatar/' + md5(res.id + (res.author || res.ip)) + '?d=retro',
					});
				});
			}
		});
	}, 2000);
});
