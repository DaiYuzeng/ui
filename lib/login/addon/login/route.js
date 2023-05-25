import $ from 'jquery';
import { inject as service } from '@ember/service';
import { get, set } from '@ember/object';
import Route from '@ember/routing/route';
import C from 'shared/utils/constants';

export default Route.extend({
  access:   service(),
  cookies:  service(),
  language: service('user-language'),
  intl:     service(),

  beforeModel() {
    return get(this, 'language').initUnauthed();
  },

  model(params) {
    const firstLogin               = get(this, 'access.firstLogin');
    let overrideErrorMessage       = false;
    let errorMessageTranslationKey = 'unknown';

    if (params.errorMsg) {
      overrideErrorMessage = true;

      if (this.intl.exists(`loginPage.error.${ params.errorMsg }`)) {
        errorMessageTranslationKey = params.errorMsg;
      }
    }

    if ( firstLogin ) {
      const code = {
        username: 'admin',
        password: 'admin',
      };

      return get(this, 'access').login('local', code).then((/* user*/) => {
        get(this, 'cookies').setWithOptions(C.COOKIE.USERNAME, 'admin', {
          expire: 365,
          secure: 'auto'
        });

        set(this, 'access.userCode', code);

        this.transitionToExternal('update-password');
      }).catch(() => {
        return {
          firstLogin:     true,
          user:           null,
          changePassword: false,
          code:           null,
          overrideErrorMessage,
          errorMessageTranslationKey,
        };
      });
    } else {
      return {
        firstLogin:     false,
        user:           null,
        changePassword: false,
        code:           null,
        overrideErrorMessage,
        errorMessageTranslationKey,
      };
    }
  },

  setupController(controller, model) {
    this._super(controller, model);

    if (get(model, 'overrideErrorMessage')) {
      controller.set('errorMsg', get(model, 'errorMessageTranslationKey'));
    }
  },

  resetController(controller, isExisting /* , transition*/ ) {
    if (isExisting) {
      controller.setProperties({
        changePassword:    false,
        waiting:           false,
        adWaiting:         false,
        shibbolethWaiting: false,
        localWaiting:      false,
      })
    }
  },

  activate() {
    // Redirect to /dashboard in a production build
    // The Rancher CLI still uses /login - so don't redirect if a query string is present
    const isDevelopment = get(this, 'app.environment') === 'development';
    const showLogin = isDevelopment || !!window.location.search;

    if (!showLogin) {
      const url = `${ window.location.origin }/dashboard`;

      window.location.replace(url);
    } else {
      $('BODY').addClass('container-farm'); // eslint-disable-line
    }
  },

  deactivate() {
    $('BODY').removeClass('container-farm'); // eslint-disable-line
  },

});
