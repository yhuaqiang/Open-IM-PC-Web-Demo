import cloudbase from "@cloudbase/js-sdk";
// const CircularJSON = require('circular-json');

const wx = null;

// import IM from './im';
const DefaultUser = {
  test: true,
  role: 0,
  uno: 0,
  uid: '123',
  openid: '123',
  nickName: '张三',
  avatarUrl: '',
  email: '',
  gender: 0, //值为1时是男性，值为2时是女性，值为0时是未知
};

function getDefaultUser() {
  return JSON.parse(JSON.stringify(DefaultUser));
}
let app;
const Lib = {
  projId: 1,
  vue: false,
  ok: false,
  iswx: false,
  imuid: null,
  user: getDefaultUser(),
  selectedChat: null,
  isOwner: false,
  error: {
    result: {
      ok: false,
      msg: '出错了~'
    }
  },
  anonimous: false,
  loginMode: '',
  auth: false,
  db: false,
  provider: false,
  passOpenid: false,
  im: false,
  watchers: {},
  wxjs: false,
  wxjsOk: false,
  wxjsCfg: {},
  isInWX() {
    return /micromessenger/gi.test(navigator.userAgent) ? true : false;
  },
  init(config, vue) {
    if (vue) {
      this.vue = vue;
      // IM.vue = vue;
    }
    const {
      projId,
      anonimous,
      loginMode, // WXMP,WXOPEN,ANOY,NONE,EMAIL,CUSTOM,USERPASS,SMS
      im,
      APPID,
      envId,
      scope,
      passOpenid,
      wxjs,
    } = config;
    this.projId = projId;
    this.anonimous = anonimous;
    this.loginMode = loginMode;
    this.iswx = this.isInWX();
    this.wxjs = wxjs || false;
    Object.assign(this, {
      [`${loginMode}Mode`]: true
    });
    this.im = im;
    this.passOpenid = passOpenid;
    app = cloudbase.init({
      env: envId,
    });
    if (this.anonimous) {
    } else if (this.WXMPMode || this.WXOPENMode) {
      this.auth = app.auth({
        persistence: "local"
      });
      this.provider = this.auth.weixinAuthProvider({
        appid: APPID,
        scope: scope
      });
    } else if (this.EMAILMode) {
      this.auth = app.auth({
        persistence: "local"
      });
    }
    return this;
  },
  async checkSession(callback) {
    let state = false;
    if (this.auth) {
      state = this.auth.hasLoginState();

      if (this.WXOPENMode || this.WXMPMode) {
        if (!state) {
          state = await this.provider.getRedirectResult({ syncUserInfo: true }).catch(err => {
            console.log('sigin err', err);
            return false;
          });
        }
      }
    }
    let logined = state ? true : false;
    if (logined) {
      await this.initUserInfo();
      if (this.user.test) {
        logined = false;
      }
    }
    // if (!logined) {
    //   this.vue.$bus.$emit('user.logout', { force: true });
    // }
    this.initWXJS();
    console.log('checkSession', state, logined, this.user);
    callback && callback(logined, this.user);
  },
  async initUserInfo() {
    let state = this.auth.hasLoginState();
    if (state) {
      this.db = app.database();
      let user = this.auth.currentUser;
      /*
       user = await this.auth.getUserInfo()
          .catch(err => {
              console.log('getUserInfo err', err);
              return false;
          });
          //*/
      if (user && user.uid) {
        this.ok = true;
        if (this.EMAILMode) {
          user.openid = user.uid;
          user.nickName = user.email.split('@')[0];
        } else {
          user.openid = user.unionId;
        }
        Object.assign(this.user, user, {
          test: false,
        });
      }
    }
    console.log('initUserInfo', this.user);

    if (!this.user.test) {
      this.setUser();
    }
  },
  colname(name) {
    return `1-${name}`;
  },
  showLoading(showLoading, show) {
    if (this.vue && this.vue.$ShowLoading && showLoading) {
      this.vue.$ShowLoading(show);
    }
  },
  getUser(simple) {
    //
    let user = {};
    for (var i in this.user) {
      if (typeof this.user[i] == 'string') {
        user[i] = this.user[i];
      }
    }
    if (simple) {
      return {
        nickName: user.nickName,
        avatar: user.avatarUrl,
      };
    }
    return user;
  },
  setUser() {
    this.user.gender = this.user.gender == 'MALE' ? 1 : this.user.gender == 'FEMALE' ? 2 : 0;
    if (this.iswx) {
      // this.user.openid = this.user.wxOpenId;
    }

    this.saveUser();
  },
  saveUser() {
    // if (this.vue) {
    //   this.vue.$store.dispatch('SetUser', this.user);
    // } else {
    //   console.error('vue is null');
    // }
  },
  async test() {
    console.log('test');
    console.log('cloudbase', cloudbase);
  },
  /**
   * 微信账号登录
   * @param {*} showLoading
   */
  async login(showLoading, vue, data) {
    data = data || {};
    if (vue) {
      this.vue = vue;
      // IM.vue = vue;`
    }

    if (this.ok) {
      console.log('has logined');
      // return true;
    }
    this.showLoading(showLoading, true);
    let state = false;
    state = this.auth.hasLoginState();
    let user = this.auth.currentUser;
    if (!user || !user.uid) {
      state = false;
    }
    if (window.$xutils?.isInWX()) {
      if (!state) {
        this.provider.signInWithRedirect();
        state = await this.provider.getRedirectResult().catch(err => {
          console.log('sigin err', err);
          return false;
        });
        console.log('new state', state);
      }
      if (state) {
        let user = this.auth.currentUser;
        console.log('currentUser', user);
        if (!user.uid) {
          state = false;
        }
        /*
        user = await this.auth.getUserInfo()
            .catch(err => {
                console.log('getUserInfo err', err);
                return {};
            });
        //*/
        console.log('getUserInfo', user);
        Object.assign(this.user, user, {
          test: false,
        });
        //
        this.auth.onLoginStateExpired(() => {
          // 此时登录状态过期，需要重新登录
          console.log('onLoginStateExpired');
          this.relogin();
        });
      }
    } else {
      if (this.EMAILMode) {
        state = await this.auth.signInWithEmailAndPassword(data.email || '', data.password || '').catch(err => {
          console.log('sigin err', err);
          return false;
        });

      } else if (this.WXOPENMode) {
        this.provider.signInWithRedirect();
      } else {
        state = await this.auth.anonymousAuthProvider().signIn().catch(err => {
          return false;
        });
      }
      console.log('new state', state);

    }
    this.initUserInfo();
    console.log('final state', state, this.user);
    if (state) {
      this.ok = true;
      let res;
      if (this.projId == 1) {
        res = await this.call('user.role');
        if (res.ok) {
          this.user.role = res.data.role || 0;
          this.user.isOwner = this.user.role === 1;
          if (!this.iswx) {
            this.user.avatarUrl = '';
            // require(`@pinche/static/img/avatar-${this.user.isOwner?'o':'p'}.png`);
          }
        }
      }
      res = this.call('user.launch')
      console.log('role ok', this.ok, this.user);

      if (!this.user.test) {
        this.setUser();
      }
      // 放在setUser之后
      if (this.im) {
        this.initIM();
      }
    } else {

    }
    this.showLoading(showLoading, false);
    return state ? true : false;
  },
  async register(user) {
    let res = { ok: false, msg: '操作失败' };
    if (this.EMAILMode) {
      let r = await this.auth.signUpWithEmailAndPassword(user.email || '', user.password || '').catch(err => {
        console.log('sigup err', err);
        res.msg = err.message.replace(/\[.*\]/gi, '').trim();
        return false;
      });
      if (r && r.requestId) {
        res.ok = true;
      }
    }
    console.log('register', user, res);
    return res;
  },
  async resetPass(user) {
    let res = { ok: false, msg: '' };
    if (this.EMAILMode) {
      let r = await this.auth.sendPasswordResetEmail(user.email || '').catch(err => {
        console.log('resetPass', err);
        res.msg = err.message.replace(/\[.*\]/gi, '').trim();
        return false;
      });
      if (r && r.requestId) {
        res.ok = true;
      }
    }
    return res;
  },
  /**
   * 获取/设置身份
   * @param {*} role
   */
  async role(role) {
    return await new Promise(resolve => {
      let times = 0;
      let timer = setInterval(() => {
        if (this.user.role !== false) {
          clearInterval(timer);
          // 空参数是get
          // 有参数为set
          if (arguments.length > 0) {
            this.user.role = role ? 1 : 0;
            this.setUser();
          }
          resolve(this.user.role);
        } else if (times++ > 60) {
          clearInterval(timer);
          console.log('wait timeout');
          // this.vue.$dialog({
          //   message: '出错了呀o(╯□╰)o'
          // }).then(() => {
          //   // this.vue.$router.go(-1);
          // });
        } else {
          console.log('waiting role');
        }
      }, 500)
    });
  },
  // wx-js-sdk
  async initWXJS() {
    if (!this.iswx || !this.wxjs) {
      return;
    }
    console.log('initWXJS');
    let res = await this.call('gzh.jscfg', {
      url: window.location.href
    });
    if (res.ok) {
      // res.data.debug = true;
      this.wxjsCfg = res.data.config;
      wx?.config(this.wxjsCfg);
      wx?.ready(() => {
        this.wxjsOk = true;
        console.log('wxjs ok');
        let shareInfo = res.data.shareInfo;
        this.updateWXShareData(shareInfo);
      });

      wx?.error((err) => {
        this.wxjsOk = false;
        console.log('wxjs err', err);
      });
    } else {
      console.error('wxjs', res);
    }
  },
  updateWXShareData(data) {
    let params = {
      title: data.title, // 分享标题
      desc: data.desc, // 分享描述
      link: data.link || window.location.href, // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
      imgUrl: data.imgUrl || `${window.location.protocol}//${window.location.hostname}/static/static002/images/avatar.png`, // 分享图标
      success: function () {
        // 设置成功
        console.log('updateWXShareData ok')
      },
      fail: function (err) {
        console.log('fail', err);
      }
    };
    wx && wx.onMenuShareAppMessage(params);
    wx && wx.onMenuShareTimeline(params);
  },
  // async initIM() {
  //     IM.init(app, this.user);
  // },
  // async closeIM() {
  //     IM.stopWatch();
  // },
  /**
   * 调用云函数
   * @param {*} api
   * @param {*} params
   * @param {*} showLoading 是否静默,即不显示loading
   */
  async call(api, params, showLoading) {
    // 等待login成功
    await new Promise(resolve => {
      let state;
      let count = 0;
      let timer = setInterval(() => {
        if (this.ok) {
          state = this.auth.hasLoginState();
          if (state) {
            this.ok = true;
            window.clearInterval(timer);
          }
          console.log('api ok', this.ok);
          resolve();
        } else {
          console.log('api not ok');
          if (count++ > 60) {
            window.clearInterval(timer);
            // this.vue.$bus.$emit("login");
            resolve();
          }
        }
      }, 50);
    });
    if (api !== 'user.role') {
      await this.role();
    }
    //
    return this.ok ? await this.docall(api, params, showLoading) : this.error;
  },
  async docall(api, params, showLoading) {
    this.showLoading(showLoading, true);
    params = params || {};
    if (this.user.role !== false) {
      params = Object.assign(
        {
          role: this.user.role,
          openid: this.passOpenid ? this.user.openid : '',
        },
        params);
    }
    let data = {
      projId: this.projId,
      api,
      p: params,
      local: true,
      _HOST_: window.location.host,
      _REFERER_: document.referrer,
    }
    let res = await app.callFunction({
      name: 'apigate',
      data,
    }).catch(err => {
      console.error(api, params, err);
      // 是否是cloudbase-未登录
      let msg = err.message;
      console.error('docall', msg);
      if (msg.indexOf('refresh access_token failed') > -1) {
        this.relogin();
        return {
          result: {
            ok: false,
            msg: '请重新登陆~'
          }
        }
      }

      return this.error;
    });
    this.showLoading(showLoading, false);

    if (!res.result || Object.keys(res.result).length == 0) {
      res = this.error;
    }
    console.log(api, params, res);
    res = res.result;

    try {
      window.$xutils.cnzz.track(`api.${api}.${params.openid}.${res.ok ? 1 : 0}`);
    } catch (e) { }

    return res;
  },
  relogin() {
    this.login('', '', '');
    // if (this.vue.$xutils.isMobile()) {
    //   location.reload();
    //   return;
    // }

    // this.vue.$dialog.alert({
    //   message: '您需要重新登录'
    // }).then(() => {
    //   this.vue.$router.replace({
    //     name: 'Home'
    //   });
    // });
  },
  async logout(callback) {
    if (this.auth) {
      await this.auth.signOut();
    }
    this.ok = false;
    this.user = getDefaultUser();
    callback && callback();
  },
  ts(fmt) {
    // fmt = fmt || 'yyyyMMddhhmmss.S';
    fmt = fmt || 'yyyyMMddhhmmssS';
    let d = new Date();
    var o = {
      "M+": d.getMonth() + 1, //月份
      "d+": d.getDate(), //日
      "h+": d.getHours(), //小时
      "m+": d.getMinutes(), //分
      "s+": d.getSeconds(), //秒
      "q+": Math.floor((d.getMonth() + 3) / 3), //季度
      "S": d.getMilliseconds() //毫秒
    };
    if (/(y+)/.test(fmt))
      fmt = fmt.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
      if (new RegExp("(" + k + ")").test(fmt))
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
  },
  async upload(file, cloudPath, cdnUrl) {
    cdnUrl = true;
    let result = {
      ok: false,
      fileId: '',
      url: ''
    };
    let res = await app.uploadFile({
      filePath: file,
      cloudPath,
      onUploadProgress: progressEvent => {
        var percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(percentCompleted, progressEvent);
      }
    }).catch(err => {
      console.log(err);
      return { code: 400 };
    });
    console.log('upload', res);
    if (!res.code && res.fileID) {
      let fileID = res.fileID;
      // 获取cdnurl
      if (cdnUrl) {
        res = await app.getTempFileURL({
          fileList: [{
            fileID,
            maxAge: 24 * 3600,
          }],
        });
        console.log('tmpurl', res);
        res = res.fileList[0];
        if (res && res.code == 'SUCCESS') {
          result.ok = true;
          result.fileID = fileID;
          result.url = res.tempFileURL;
        }
      }
    }
    return result;
  },
  /**
   *
   * @param {*} colname
   * @param {*} cond
   * @param {*} callback
   * 表的权限要`所有用户可读`
   */
  startWatch(colname, cond, callback) {
    this.stopWatch(colname);
    console.log('startwatch', colname, cond);
    this.watchers[colname] = this.db.collection(`3-${colname}`).where(cond).watch({
      onChange: snapshot => {
        console.log(colname, 'snapshot', snapshot);
        let docs = snapshot.docChanges.filter(n => {
          return n.dataType == 'update';
        }).map(n => {
          n.doc.id = n.docId;
          delete n.doc._id;
          return {
            doc: n.doc,
            fields: n.updatedFields,
          };
        });
        if (docs.length == 0) {
          return;
        }
        callback && callback(docs);
        console.log(colname, 'msg: ', docs);
      },
      onError: err => {
        console.error('get err', colname, err);
      }
    });

  },
  stopWatch(colname) {
    console.log('stopWatch', colname);
    if (this.watchers[colname]) {
      this.watchers[colname].close();
    }
  }
};

export default Lib;
