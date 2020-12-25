APP.disclaimers = {
    disclaimers: APP.config.disclaimers,
    hasPriorityCount: 0,
    getText: function (disclaimer) {
        if (disclaimer.messages) {
            for (var i in disclaimer.messages) {
                if (disclaimer.messages[i].language.toLowerCase() == 'ru') {
                    return disclaimer.messages[i].message;
                }
            }
        }
        return '';
    },
    getMainPageDisclaimers: function() {
        return APP.request.makeRequest("GET", APP.config.cmsUrl + 'disclaimers/page', false, {
            '_': Math.random(),
            'page': 'main_v1',
            'region': APP.config.userSelectedRegion
        }).then(function(response) {
            if (response && response.length) {
                return response
            }
        });
    },
    getData: function(){
        return APP.request.makeRequest("GET", APP.config.cmsUrl + 'disclaimers/epgu', false, {
            '_': Math.random()
        }).then(function(response) {
                if (response && response.length) {
                    return response
                }
            });

    },
    createData: function () {
        var self = this;
            preDisclaimers = [];
        var prepareDisclaimers = function() {
            self.disclaimers.forEach(function (disclaimer) {
                if (~disclaimer.mnemonic.indexOf("DESKTOP") && APP.config.device !== 'dk') {
                    return;
                }
                if (~disclaimer.mnemonic.indexOf("MOBILE") && APP.config.device === 'dk') {
                    return;
                }
                preDisclaimers.push({
                    id: disclaimer.id,
                    level: disclaimer.level.toLowerCase(),
                    text: self.getText(disclaimer) ,
                    notificationEnabled: disclaimer.notificationEnabled,
                    mnemonic: disclaimer.mnemonic,
                    isPriority: disclaimer.isPriority
                });
            }.bind(self));
            if (!self.disclaimers) {
                self.disclaimers = {};
            }
            self.disclaimers['main'] = preDisclaimers;
            self.createTemplate();
        };
        if (!this.disclaimers || !this.disclaimers['main']){
            Promise.all([self.getMainPageDisclaimers(), self.getData()]).then(function(disclaimers){
                var disclaimersArr = [];
                if(disclaimers && disclaimers.length) {
                    disclaimers.forEach(function(disclaimersItem) {
                        if(disclaimersItem && disclaimersItem.length) {
                            disclaimersItem.forEach(function(disclaimerItem) {
                                if(disclaimerItem) {
                                    disclaimersArr.push(disclaimerItem);
                                }
                            })
                        }
                    });
                }
                self.disclaimers = disclaimersArr;
                if (self.disclaimers && self.disclaimers.length) {
                    prepareDisclaimers();
                }
            })
        } else {
            prepareDisclaimers();
        }
    },
    close: function(id) {
        APP.cookie.set('disclaimerClosed-' + id, id, {domain: APP.config.cookieDomain, path: '/', expires: 24 * 365, expirationUnit: 'hours'});
        APP.disclaimers.hasPriorityCount--;
        var disclaimerToDelete = document.getElementById("disclaimer_" + id);
        if (disclaimerToDelete) {
            disclaimerToDelete.classList.add('hide');
        }
        if (APP.disclaimers.hasPriorityCount <= 0) {
            document.getElementById('main-disclaimers-index').classList.remove('has-priority-disclaimers');
        }
    },
    toggle: function(event) {
        var clsList = event.target.nextSibling.classList;
        if(clsList.contains('hide')){
            clsList.remove('hide');
        }else{
            clsList.add('hide');
        }
        [].forEach.call(document.querySelectorAll('.subscription-additional'), function (item) {
           item.classList.add('hide');
        });
    },
    validateEmail: function(id) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(document.getElementById(id).value.toLowerCase());
    },
    callSubscription: function(event) {
        var params = {
            "id": event.target.dataset.id,
            "email": document.getElementById(event.target.id).value,
            "url": "/"
        },
            throbber = document.querySelector('.subscription-throbber'),
            emailInput = document.getElementById(event.target.id),
            waitBlock = document.querySelector('.subscription-wait');

        waitBlock.classList.remove('hide');
        APP.throbber.show(throbber, true);

        APP.request.makeRequest("POST", APP.config.notificationApiUrl + 'subscribe/disclaimer/', false, params)
            .then(function() {
                APP.throbber.hide(throbber, true);
                waitBlock.classList.add('hide');
                document.querySelector('.send-subscription--ok').classList.remove('hide');
                document.querySelector('.subscription-form').classList.add('hide');
                document.querySelector('.subscription-mail').innerHTML = emailInput.value;
                emailInput.value = '';
            }, function (err) {
                APP.throbber.hide(throbber, true);
                waitBlock.classList.add('hide');
                if (err && err.status == 409) {
                    document.querySelector('.send-subscription--retry').classList.remove('hide');
                    document.querySelector('.subscription-mail--retry').innerHTML = emailInput.value;
                }
                else {
                    document.querySelector('.send-subscription--error').classList.remove('hide');
                }
                document.querySelector('.subscription-form').classList.add('hide');
                emailInput.value = '';
            })
    },
    onKeyUp: function(event) {
        var subscriptionBtn = document.getElementById('button-subscription');
        if(this.validateEmail(event.target.id)){
            subscriptionBtn.removeAttribute('disabled');
        }else{
            subscriptionBtn.setAttribute('disabled', 'disabled');
        }
    },
    onBlur: function (event, disclaimerId) {
        var val = event.target.value;
        if(!val){
            document.querySelector('.subscription-text-' + disclaimerId).classList.remove('has_content');
        }
    },
    onFocus: function(event, disclaimerId) {
        document.querySelector('.subscription-text-' + disclaimerId).classList.add('has_content');
    },
    createTemplate: function () {
        var wrap = document.getElementById('main-disclaimers-index');
        wrap.innerHTML = '';
        var html = '';
        var subscriptionBlock;

        this.disclaimers.main.forEach(function (disclaimer) {

            if(APP.cookie.read('disclaimerClosed-' + disclaimer.id)){
                return false;
            }
            var priorityClass = disclaimer.isPriority ? ' priority' : ' not-priority';
            if (disclaimer.isPriority) {
                APP.disclaimers.hasPriorityCount++;
            }

            subscriptionBlock = disclaimer.notificationEnabled ? '<a class="text-link dashed" data-ng-if="disclaimer.notificationEnabled" onclick="APP.disclaimers.toggle(event)">Подпишитесь на уведомление</a>' : '';

            html += '' +
                '<div id="disclaimer_' + disclaimer.id +'" class="disclaimer-container ' + disclaimer.level + priorityClass + '">' +
                    '<div class="disclaimer '+disclaimer.level+'">' +
                        '<h4>Внимание!</h4>' +
                        '<p>'+disclaimer.text+'</p>' +
                        '<span class="icomoon"></span>' +
                        '<a class="close" onclick="APP.disclaimers.close('+disclaimer.id+')"></a>' +
                        '<div>' +
                            subscriptionBlock +
                            '<div class="offset-top-x-sm subscription-form hide">' +
                                '<div>' +
                                    '<div class="grid-wrap__row">' +
                                        '<div class="grid-wrap__col-lg-8 grid-wrap__col-md-6 grid-wrap__col-sm-6">' +
                                            '<div class="epgu-input-text subscription-text floating-placeholder subscription-text-'+disclaimer.id+'"><label for="disclaimer-input-'+disclaimer.id+'">Адрес электронной почты</label><input onfocus="APP.disclaimers.onFocus(event, '+disclaimer.id+')" onblur="APP.disclaimers.onBlur(event, '+disclaimer.id+')" onkeyup="APP.disclaimers.onKeyUp(event)" id="disclaimer-input-'+disclaimer.id+'" type="email" autocomplete="off"></div>' +
                                        '</div>' +
                                        '<div class="grid-wrap__col-lg-8 grid-wrap__col-sm-6">' +
                                            ' <button id="button-subscription" data-id="'+disclaimer.id+'" onclick="APP.disclaimers.callSubscription(event)" disabled class="button-medium button-base button-blue button-long-phone">Получить уведомление</button>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                                '<div class="offset-top-extra-sm"><span class="plain-text">Мы сообщим, когда проблема будет решена</span></div>' +
                            '</div>' +
                            '<div class="clearfix offset-top-x-sm subscription-additional subscription-wait hide"><div class="flex-container align-items-center"><div class="subscription-throbber throbber-small"></div><div>Подписка выполняется</div></div></div>' +
                            '<div class="clearfix offset-top-x-sm subscription-additional send-subscription send-subscription--ok hide"><div class="type_ok"><span class="send-message plain-text">Уведомление придет на <span class="bold subscription-mail"></span></span></div></div>' +
                            '<div class="cleanfix offset-top-x-sm subscription-additional send-subscription send-subscription--retry hide"><div class="type_repeat"><span class="send-message plain-text">Подписка для <span class="bold subscription-mail--retry"></span> уже оформлена</span></div></div>' +
                            '<div class="clearfix offset-top-x-sm subscription-additional send-subscription send-subscription--error hide"><div class="type_repeat"><span class="send-message plain-text">Ошибка. Попробуйте еще раз</span></div></div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        });

        wrap.innerHTML = html;
        if (APP.disclaimers.hasPriorityCount) {
            wrap.classList.add('has-priority-disclaimers');
        }
    },
    hideTopBanner: function() {
        if(this.disclaimers.length){
            document.querySelector('.disclaimer-banner').classList.add('hide');
        }
    },
    init: function () {
        // this.hideTopBanner();
        this.createData();
    }
};
