// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.session_new', ['core', 'lmn.common']);

}).call(this);

'use strict';

angular.module('lmn.session_new').config(function ($routeProvider) {
    $routeProvider.when('/view/lmn/sessionsList', {
        templateUrl: '/lmn_session_new:resources/partial/sessionsList.html',
        controller: 'LMNSessionsListController'
    });

    $routeProvider.when('/view/lmn/session', {
        templateUrl: '/lmn_session_new:resources/partial/session.html',
        controller: 'LMNSessionController'
    });
});


'use strict';

angular.module('lmn.session_new').service('lmnSession', function ($http, $uibModal, $q, $location, $window, messagebox, validation, notify, gettext, identity) {
    var _this = this;

    this.sessions = [];

    this.load = function () {
        var promiseList = [];
        promiseList.push($http.get('/api/lmn/session/schoolclasses').then(function (resp) {
            _this.schoolclasses = resp.data;
        }));

        promiseList.push($http.get('/api/lmn/session/projects').then(function (resp) {
            _this.projects = resp.data;
        }));

        promiseList.push($http.get('/api/lmn/session/sessions').then(function (resp) {
            _this.sessions = resp.data;
        }));

        return $q.all(promiseList).then(function () {
            return [_this.schoolclasses, _this.projects, _this.sessions];
        });
    };

    this.filterExamUsers = function () {
        _this.extExamUsers = _this.current.members.filter(function (user) {
            return !['---', identity.user].includes(user.sophomorixExamMode[0]);
        });
        _this.examUsers = _this.current.members.filter(function (user) {
            return [identity.user].includes(user.sophomorixExamMode[0]);
        });
    };

    this.start = function (session) {
        _this.current = session;
        $http.post('/api/lmn/session/userinfo', { 'users': _this.current.members }).then(function (resp) {
            _this.current.members = resp.data;
            _this.current.generated = false;
            _this.current.type = 'session';
            _this.filterExamUsers();
            $location.path('/view/lmn/session');
        });
    };

    this.reset = function () {
        _this.current = {
            'sid': '',
            'name': '',
            'generated': false,
            'members': [],
            'type': ''
        };
    };

    this.reset();

    this.startGenerated = function (groupname, members, session_type) {
        generatedSession = {
            'sid': Date.now(),
            'name': groupname,
            'members': members,
            'generated': true,
            'type': session_type // May be room or schoolclass or project
        };
        _this.current = generatedSession;
        _this.filterExamUsers();
        $location.path('/view/lmn/session');
    };

    this.getExamUsers = function () {
        users = _this.current.members.map(function (user) {
            return user.cn;
        });
        $http.post('/api/lmn/session/exam/userinfo', { 'users': users }).then(function (resp) {
            _this.current.members = resp.data;
            _this.filterExamUsers();
            $location.path('/view/lmn/session');
        });
    };

    this.refreshUsers = function () {
        users = _this.current.members.map(function (user) {
            return user.cn;
        });
        return $http.post('/api/lmn/session/userinfo', { 'users': users }).then(function (resp) {
            _this.current.members = resp.data;
            _this.filterExamUsers();
            $location.path('/view/lmn/session');
        });
    };

    this.new = function () {
        var members = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        return messagebox.prompt(gettext('Session Name'), '').then(function (msg) {
            if (!msg.value) {
                return;
            }

            testChar = validation.isValidLinboConf(msg.value);
            if (testChar != true) {
                notify.error(gettext(testChar));
                return;
            }

            return $http.put('/api/lmn/session/sessions/' + msg.value, { members: members }).then(function (resp) {
                notify.success(gettext('Session Created'));
            });
        });
    };

    this.rename = function (sessionID, comment) {
        if (!sessionID) {
            messagebox.show({ title: gettext('No Session selected'), text: gettext('You have to select a session first.'), positive: 'OK' });
            return;
        }

        return messagebox.prompt(gettext('Session Name'), comment).then(function (msg) {
            if (!msg.value) {
                return;
            }

            testChar = validation.isValidLinboConf(msg.value);
            if (testChar != true) {
                notify.error(gettext(testChar));
                return;
            }
            return $http.post('/api/lmn/session/sessions', { action: 'rename-session', session: sessionID, comment: msg.value }).then(function (resp) {
                notify.success(gettext('Session renamed'));
                return msg.value;
            });
        });
    };

    this.kill = function (sessionID, comment) {
        if (!sessionID) {
            messagebox.show({ title: gettext('No session selected'), text: gettext('You have to select a session first.'), positive: 'OK' });
            return;
        }

        return messagebox.show({ text: gettext('Delete Session: ' + comment + ' ?'), positive: gettext('Delete'), negative: gettext('Cancel') }).then(function () {
            return $http.delete('/api/lmn/session/sessions/' + sessionID).then(function (resp) {
                notify.success(gettext(resp.data));
            });
        });
    };

    return this;
});


// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.session_new').controller('LMNSessionController', function($scope, $http, $location, $route, $uibModal, $window, $q, $interval, gettext, notify, messagebox, pageTitle, lmFileEditor, lmEncodingMap, filesystem, validation, $rootScope, wait, userPassword, lmnSession) {
    var title, typeIsArray, validateResult;
    $scope.stateChanged = false;
    $scope.sessionChanged = false;
    $scope.addParticipant = '';
    $scope.addSchoolClass = '';
    $scope.examMode = false;
    $window.onbeforeunload = function(event) {
      if (!$scope.sessionChanged) {
        return;
      }
      // Confirm before page reload
      return "Eventually not refreshing";
    };
    $scope.$on("$destroy", function() {
      // Avoid confirmation on others controllers
      if ($scope.refresh !== void 0) {
        $interval.cancel($scope.refresh);
      }
      return $window.onbeforeunload = void 0;
    });
    $scope.$on("$locationChangeStart", function(event) {
      // TODO : handle logout if session is changed
      if ($scope.sessionChanged) {
        if (!confirm(gettext('Do you really want to quit this session ? You can restart it later if you want.'))) {
          event.preventDefault();
          return;
        }
      }
      return $window.onbeforeunload = void 0;
    });
    $scope.translation = {
      addStudent: gettext('Add Student'),
      addClass: gettext('Add Class')
    };
    $scope.sorts = [
      {
        name: gettext('Lastname'),
        fx: function(x) {
          return x.sn + ' ' + x.givenName;
        }
      },
      {
        name: gettext('Login name'),
        fx: function(x) {
          return x.sAMAccountName;
        }
      },
      {
        name: gettext('Firstname'),
        fx: function(x) {
          return x.givenName;
        }
      },
      {
        name: gettext('Email'),
        fx: function(x) {
          return x.mail;
        }
      }
    ];
    $scope.sort = $scope.sorts[0];
    $scope.fields = {
      sAMAccountName: {
        visible: true,
        name: gettext('Userdata')
      },
      transfer: {
        visible: true,
        name: gettext('Transfer')
      },
      workDirectory: {
        visible: true,
        name: gettext('')
      },
      sophomorixRole: {
        visible: false,
        name: gettext('sophomorixRole')
      },
      wifi: {
        visible: true,
        icon: "fa fa-wifi",
        title: gettext('Wifi-Access'),
        checkboxAll: true,
        checkboxStatus: false
      },
      internet: {
        visible: true,
        icon: "fa fa-globe",
        title: gettext('Internet-Access'),
        checkboxAll: true,
        checkboxStatus: false
      },
      intranet: {
        visible: false,
        icon: "fa fa-server",
        title: gettext('Intranet Access'),
        checkboxAll: true
      },
      webfilter: {
        visible: false,
        icon: "fa fa-filter",
        title: gettext('Webfilter'),
        checkboxAll: true,
        checkboxStatus: false
      },
      printing: {
        visible: true,
        icon: "fa fa-print",
        title: gettext('Printing'),
        checkboxAll: true,
        checkboxStatus: false
      }
    };
    $scope.backToSessionList = function() {
      return $location.path('/view/lmn/sessionsList');
    };
    $scope.session = lmnSession.current;
    $scope.extExamUsers = lmnSession.extExamUsers;
    $scope.examUsers = lmnSession.examUsers;
    $scope.refreshUsers = function() {
      return lmnSession.refreshUsers().then(function() {
        $scope.extExamUsers = lmnSession.extExamUsers;
        return $scope.examUsers = lmnSession.examUsers;
      });
    };
    if ($scope.session.type === 'schoolclass') {
      title = " > " + gettext("Schoolclass") + ` ${$scope.session.name}`;
    } else if ($scope.session.type === 'room') {
      title = " > " + gettext("Room") + ` ${$scope.session.name}`;
    } else {
      title = " > " + gettext("Group") + ` ${$scope.session.name}`;
    }
    pageTitle.set(gettext('Session') + title);
    // Nothing defined, going back to session list
    if ($scope.session.sid === '') {
      $scope.backToSessionList();
    }
    $scope.updateParticipants = function() {
      return $http.get('/api/lmn/session/userInRoom').then(function(resp) {
        if (resp.data.usersList.length !== 0) {
          return $http.post("/api/lmn/session/userinfo", {
            users: resp.data.usersList
          }).then(function(rp) {
            return $scope.session.members = rp.data;
          });
        }
      });
    };
    $scope.stopRefresh = function() {
      $interval.cancel($scope.refresh);
      return $scope.autorefresh = false;
    };
    $scope.startRefresh = function() {
      $scope.updateParticipants();
      $scope.refresh = $interval($scope.updateParticipants, 5000, 0);
      return $scope.autorefresh = true;
    };
    if ($scope.session.type === 'room') {
      $scope.startRefresh();
    }
    $scope.setManagementGroup = function(group, participant) {
      var user;
      $scope.stateChanged = true;
      if (participant[group] === true) {
        group = `no${group}`;
      }
      user = [participant.sAMAccountName];
      return $http.post('/api/lmn/managementgroup', {
        group: group,
        users: user
      }).then(function(resp) {
        notify.success(`Group ${group} changed for ${user[0]}`);
        return $scope.stateChanged = false;
      });
    };
    $scope.selectAll = function(id) {
      return console.log('later');
    };
    //        if item is 'exammode'
    //            managementgroup = 'exammode_boolean'
    $scope.setManagementGroupAll = function(group) {
      var i, len, new_value, participant, ref, usersList;
      $scope.stateChanged = true;
      usersList = [];
      new_value = !$scope.fields[group].checkboxStatus;
      ref = $scope.session.members;
      for (i = 0, len = ref.length; i < len; i++) {
        participant = ref[i];
        // Only change management group for student, and not others teachers
        if (participant.sophomorixRole === 'student') {
          participant[group] = new_value;
          usersList.push(participant.sAMAccountName);
        }
      }
      if (new_value === false) {
        group = `no${group}`;
      }
      return $http.post('/api/lmn/managementgroup', {
        group: group,
        users: usersList
      }).then(function(resp) {
        notify.success(`Group ${group} changed for ${usersList.join()}`);
        return $scope.stateChanged = false;
      });
    };
    $scope.renameSession = function() {
      return lmnSession.rename($scope.session.sid, $scope.session.name).then(function(resp) {
        return $scope.session.name = resp;
      });
    };
    $scope.killSession = function() {
      return lmnSession.kill($scope.session.sid, $scope.session.name).then(function() {
        return $scope.backToSessionList();
      });
    };
    $scope.saveAsSession = function() {
      return lmnSession.new($scope.session.members).then(function() {
        $scope.sessionChanged = false;
        // TODO : would be better to get the session id and simply set the current session
        // instead of going back to the sessions list
        // But for this sophomorix needs to return the session id when creating a new one
        return $scope.backToSessionList();
      });
    };
    $scope.showGroupDetails = function(index, groupType, groupName) {
      return $uibModal.open({
        templateUrl: '/lmn_groupmembership:resources/partial/groupDetails.modal.html',
        controller: 'LMNGroupDetailsController',
        size: 'lg',
        resolve: {
          groupType: function() {
            return groupType;
          },
          groupName: function() {
            return groupName;
          }
        }
      });
    };
    $scope.showRoomDetails = function() {
      return $http.get('/api/lmn/session/userInRoom').then(function(resp) {
        var usersInRoom;
        if (resp.data.name === '') {
          return messagebox.show({
            title: gettext('Info'),
            text: gettext('Currently its not possible to determine your room, try to login into your computer again.'),
            positive: 'OK'
          });
        } else {
          usersInRoom = resp.data;
          return $uibModal.open({
            templateUrl: '/lmn_session_new:resources/partial/roomDetails.modal.html',
            controller: 'LMNRoomDetailsController',
            size: 'lg',
            resolve: {
              usersInRoom: function() {
                return usersInRoom;
              }
            }
          });
        }
      });
    };
    $scope.findUsers = function(q) {
      return $http.get(`/api/lmn/session/user-search/${q}`).then(function(resp) {
        return resp.data;
      });
    };
    $scope.findSchoolClasses = function(q) {
      return $http.get(`/api/lmn/session/schoolClass-search/${q}`).then(function(resp) {
        return resp.data;
      });
    };
    $scope.$watch('addParticipant', function() {
      if ($scope.addParticipant) {
        return $http.post('/api/lmn/session/userinfo', {
          'users': [$scope.addParticipant.sAMAccountName]
        }).then(function(resp) {
          var new_participant;
          new_participant = resp.data[0];
          $scope.addParticipant = '';
          if (!$scope.session.generated) {
            // Real session: must be added in LDAP
            $http.post('/api/lmn/session/participants', {
              'users': [new_participant.sAMAccountName],
              'session': $scope.session.sid
            });
          } else {
            $scope.sessionChanged = true;
          }
          $scope.session.members.push(new_participant);
          return $scope.refreshUsers();
        });
      }
    });
    $scope.$watch('addSchoolClass', function() {
      var members;
      if ($scope.addSchoolClass) {
        members = $scope.addSchoolClass.sophomorixMembers;
        return $http.post('/api/lmn/session/userinfo', {
          'users': members
        }).then(function(resp) {
          var new_participants;
          new_participants = resp.data;
          $scope.addSchoolClass = '';
          if (!$scope.session.generated) {
            // Real session: must be added in LDAP
            $http.post('/api/lmn/session/participants', {
              'users': members,
              'session': $scope.session.sid
            });
          } else {
            $scope.sessionChanged = true;
          }
          $scope.session.members = $scope.session.members.concat(new_participants);
          return $scope.refreshUsers();
        });
      }
    });
    $scope.removeParticipant = function(participant) {
      var deleteIndex;
      deleteIndex = $scope.session.members.indexOf(participant);
      if (deleteIndex !== -1) {
        if ($scope.session.generated) {
          // Not a real session, just removing from participants list displayed
          $scope.session.members.splice(deleteIndex, 1);
          return $scope.sessionChanged = true;
        } else {
          return $http.patch('/api/lmn/session/participants', {
            'users': [participant.sAMAccountName],
            'session': $scope.session.sid
          }).then(function() {
            return $scope.session.members.splice(deleteIndex, 1);
          });
        }
      }
    };
    $scope.startExam = function() {
      // End exam for a whole group
      $scope.stateChanged = true;
      return $http.patch("/api/lmn/session/exam/start", {
        session: $scope.session
      }).then(function(resp) {
        $scope.examMode = true;
        $scope.stateChanged = false;
        return lmnSession.getExamUsers();
      });
    };
    $scope.stopExam = function() {
      // End exam for a whole group
      $scope.stateChanged = true;
      return messagebox.show({
        text: gettext('Do you really want to end the current exam?'),
        positive: gettext('End exam mode'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.patch("/api/lmn/session/exam/stop", {
          session: $scope.session
        }).then(function(resp) {
          $scope.refreshUsers();
          $scope.examMode = false;
          return $scope.stateChanged = false;
        });
      });
    };
    $scope._stopUserExam = function(user) {
      var uniqSession;
      // End exam for a specific user: backend promise without messagebox
      uniqSession = {
        'members': [user],
        'name': `${user.sophomorixAdminClass}_${user.sAMAccountName}_ENDED_FROM_${identity.user}`,
        'type': ''
      };
      return $http.patch("/api/lmn/session/exam/stop", {
        session: uniqSession
      });
    };
    $scope.stopUserExam = function(user) {
      var exam_student, exam_teacher;
      // End exam for a specific user
      exam_teacher = user.sophomorixExamMode[0];
      exam_student = user.displayName;
      return messagebox.show({
        text: gettext('Do you really want to remove ' + exam_student + ' from the exam of ' + exam_teacher + '?'),
        positive: gettext('End exam mode'),
        negative: gettext('Cancel')
      }).then(function() {
        return $scope._stopUserExam(user).then(function() {
          $scope.refreshUsers();
          return notify.success(gettext('Exam mode stopped for user ') + exam_student);
        });
      });
    };
    $scope.stopRunningExams = function() {
      // End all running extern exams (run by other teachers)
      return messagebox.show({
        text: gettext('Do you really want to end all running exams?'),
        positive: gettext('End exam mode'),
        negative: gettext('Cancel')
      }).then(function() {
        var i, j, len, len1, promises, ref, ref1, user;
        promises = [];
        ref = $scope.extExamUsers;
        for (i = 0, len = ref.length; i < len; i++) {
          user = ref[i];
          promises.push($scope._stopUserExam(user));
        }
        ref1 = $scope.examUsers;
        for (j = 0, len1 = ref1.length; j < len1; j++) {
          user = ref1[j];
          promises.push($scope._stopUserExam(user));
        }
        return $q.all(promises).then(function() {
          $scope.refreshUsers();
          return notify.success(gettext('Exam mode stopped for all users.'));
        });
      });
    };
    $scope._checkExamUser = function(username) {
      if (username.endsWith('-exam')) {
        messagebox.show({
          title: gettext('User in exam'),
          text: gettext('This user seems to be in exam. End exam mode before changing password!'),
          positive: 'OK'
        });
        return true;
      }
      return false;
    };
    $scope.showFirstPassword = function(username) {
      $scope.blurred = true;
      // if user is exam user show InitialPassword of real user
      username = username.replace('-exam', '');
      return userPassword.showFirstPassword(username).then(function(resp) {
        return $scope.blurred = false;
      });
    };
    $scope.resetFirstPassword = function(username) {
      if (!$scope._checkExamUser(username)) {
        return userPassword.resetFirstPassword(username);
      }
    };
    $scope.setRandomFirstPassword = function(username) {
      if (!$scope._checkExamUser(username)) {
        return userPassword.setRandomFirstPassword(username);
      }
    };
    $scope.setCustomPassword = function(user, pwtype) {
      if (!$scope._checkExamUser(user.sAMAccountName)) {
        return userPassword.setCustomPassword(user, pwtype);
      }
    };
    $scope.userInfo = function(user) {
      return $uibModal.open({
        templateUrl: '/lmn_users:resources/partial/userDetails.modal.html',
        controller: 'LMNUserDetailsController',
        size: 'lg',
        resolve: {
          id: function() {
            return user;
          },
          role: function() {
            return 'students';
          }
        }
      });
    };
    typeIsArray = Array.isArray || function(value) {
      return {}.toString.call(value) === '[object Array]';
    };
    validateResult = function(resp) {
      if (resp['data'][0] === 'ERROR') {
        notify.error(resp['data'][1]);
      }
      if (resp['data'][0] === 'LOG') {
        return notify.success(gettext(resp['data'][1]));
      }
    };
    $scope.shareTrans = function(command, senders, receivers, sessioncomment) {
      var bulkMode, i, len, participantsArray, receiver;
      // When share with session we get the whole session as an array.
      // The function on the other hand waits for an array containing just the  usernames so we extract
      // these into an array
      // If share option is triggered with just one user we get this user  as a string. If so we also have
      // to put it in an array
      bulkMode = 'false';
      participantsArray = [];
      if (typeIsArray(receivers)) {
        bulkMode = 'true';
        for (i = 0, len = receivers.length; i < len; i++) {
          receiver = receivers[i];
          participantsArray.push(receiver['sAMAccountName']);
        }
      } else {
        participantsArray.push(receivers);
      }
      receivers = participantsArray;
      return $uibModal.open({
        templateUrl: '/lmn_session_new:resources/partial/selectFile.modal.html',
        controller: 'LMNSessionFileSelectModalController',
        resolve: {
          action: function() {
            return 'share';
          },
          bulkMode: function() {
            return bulkMode;
          },
          senders: function() {
            return senders;
          },
          receivers: function() {
            return receivers;
          },
          command: function() {
            return command;
          },
          sessionComment: function() {
            return sessioncomment;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'accept') {
          wait.modal(gettext('Sharing files...'), 'progressbar');
          return $http.post('/api/lmn/session/trans', {
            command: command,
            senders: senders,
            receivers: receivers,
            files: result.files,
            session: sessioncomment
          }).then(function(resp) {
            $rootScope.$emit('updateWaiting', 'done');
            return validateResult(resp);
          });
        }
      });
    };
    $scope.collectTrans = function(command, senders, receivers, sessioncomment) {
      var bulkMode, participantsArray, transTitle;
      // When collect from session we already get the users in an array containing the user objects.
      // If collect option is triggered with just on use we get this user as an object. If so we also
      // have to put it in an array.
      //console.log (command)
      //console.log (senders)
      bulkMode = 'false';
      participantsArray = [];
      if (typeIsArray(senders)) {
        bulkMode = 'true';
      } else {
        participantsArray.push(senders);
        senders = participantsArray;
      }
      transTitle = 'transfer';
      //console.log (bulkMode)
      return $uibModal.open({
        templateUrl: '/lmn_session_new:resources/partial/selectFile.modal.html',
        controller: 'LMNSessionFileSelectModalController',
        resolve: {
          action: function() {
            return 'collect';
          },
          bulkMode: function() {
            return bulkMode;
          },
          senders: function() {
            return senders;
          },
          receivers: function() {
            return receivers;
          },
          command: function() {
            return command;
          },
          sessionComment: function() {
            return sessioncomment;
          }
        }
      }).result.then(function(result) {
        if (result.response === 'accept') {
          //return
          wait.modal(gettext('Collecting files...'), 'progressbar');
          if (command === 'copy') {
            $http.post('/api/lmn/session/trans', {
              command: command,
              senders: senders,
              receivers: receivers,
              files: result.files,
              session: sessioncomment
            }).then(function(resp) {
              $rootScope.$emit('updateWaiting', 'done');
              return validateResult(resp);
            });
          }
          if (command === 'move') {
            return $http.post('/api/lmn/session/trans', {
              command: command,
              senders: senders,
              receivers: receivers,
              files: result.files,
              session: sessioncomment
            }).then(function(resp) {
              $rootScope.$emit('updateWaiting', 'done');
              return validateResult(resp);
            });
          }
        }
      });
    };
    $scope.notImplemented = function(user) {
      return messagebox.show({
        title: gettext('Not implemented'),
        positive: 'OK'
      });
    };
    // Websession part
    $scope.getWebConferenceEnabled = function() {
      return $http.get('/api/lmn/websession/webConferenceEnabled').then(function(resp) {
        if (resp.data === true) {
          $scope.websessionEnabled = true;
          return $scope.websessionGetStatus();
        } else {
          return $scope.websessionEnabled = false;
        }
      });
    };
    $scope.getWebConferenceEnabled();
    $scope.websessionIsRunning = false;
    $scope.websessionGetStatus = function() {
      var sessionname;
      sessionname = $scope.session.name + "-" + $scope.session.sid;
      return $http.get(`/api/lmn/websession/webConference/${sessionname}`).then(function(resp) {
        if (resp.data["status"] === "SUCCESS") {
          if (resp.data["data"]["status"] === "started") {
            $scope.websessionIsRunning = true;
          } else {
            $scope.websessionIsRunning = false;
          }
          $scope.websessionID = resp.data["data"]["id"];
          $scope.websessionAttendeePW = resp.data["data"]["attendeepw"];
          return $scope.websessionModeratorPW = resp.data["data"]["moderatorpw"];
        } else {
          return $scope.websessionIsRunning = false;
        }
      });
    };
    $scope.websessionToggle = function() {
      if ($scope.websessionIsRunning === false) {
        return $scope.websessionStart();
      } else {
        return $scope.websessionStop();
      }
    };
    $scope.websessionStop = function() {
      return $http.post('/api/lmn/websession/endWebConference', {
        id: $scope.websessionID,
        moderatorpw: $scope.websessionModeratorPW
      }).then(function(resp) {
        return $http.delete(`/api/lmn/websession/webConference/${$scope.websessionID}`).then(function(resp) {
          if (resp.data["status"] === "SUCCESS") {
            notify.success(gettext("Successfully stopped!"));
            return $scope.websessionIsRunning = false;
          } else {
            return notify.error(gettext('Cannot stop entry!'));
          }
        });
      });
    };
    return $scope.websessionStart = function() {
      var i, len, participant, ref, tempparticipants;
      tempparticipants = [];
      ref = $scope.session.members;
      for (i = 0, len = ref.length; i < len; i++) {
        participant = ref[i];
        tempparticipants.push(participant.sAMAccountName);
      }
      return $http.post('/api/lmn/websession/webConferences', {
        sessionname: $scope.session.name + "-" + $scope.session.sid,
        sessiontype: "private",
        sessionpassword: "",
        participants: tempparticipants
      }).then(function(resp) {
        if (resp.data["status"] === "SUCCESS") {
          $scope.websessionID = resp.data["id"];
          $scope.websessionAttendeePW = resp.data["attendeepw"];
          $scope.websessionModeratorPW = resp.data["moderatorpw"];
          return $http.post('/api/lmn/websession/startWebConference', {
            sessionname: $scope.session.name + "-" + $scope.session.sid,
            id: $scope.websessionID,
            attendeepw: $scope.websessionAttendeePW,
            moderatorpw: $scope.websessionModeratorPW
          }).then(function(resp) {
            if (resp.data["returncode"] === "SUCCESS") {
              return $http.post('/api/lmn/websession/joinWebConference', {
                id: $scope.websessionID,
                password: $scope.websessionModeratorPW,
                name: $scope.identity.profile.sn + ", " + $scope.identity.profile.givenName
              }).then(function(resp) {
                $scope.websessionIsRunning = true;
                return window.open(resp.data, '_blank');
              });
            } else {
              return notify.error(gettext('Cannot start websession! Try to reload page!'));
            }
          });
        } else {
          return notify.error(gettext("Create session failed! Try again later!"));
        }
      });
    };
  });

  // Websession part
  angular.module('lmn.session_new').controller('LMNRoomDetailsController', function($scope, $route, $uibModal, $uibModalInstance, $http, gettext, notify, messagebox, pageTitle, usersInRoom) {
    $scope.usersInRoom = usersInRoom;
    return $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
  });

  angular.module('lmn.session_new').controller('LMNSessionFileSelectModalController', function($scope, $uibModalInstance, gettext, notify, $http, bulkMode, senders, receivers, action, command, sessionComment, messagebox) {
    $scope.bulkMode = bulkMode;
    $scope.senders = senders;
    $scope.receivers = receivers;
    $scope.action = action;
    $scope.command = command;
    $scope.setTransferPath = function(username) {
      var role, school;
      role = $scope.identity.profile.sophomorixRole;
      school = $scope.identity.profile.activeSchool;
      $scope.transferPath = '/srv/webuiUpload/' + school + '/' + role + '/' + username + '/';
      // create tmp dir for upload
      $scope.createDir($scope.transferPath);
      return $scope.owner = username;
    };
    $scope.save = function() {
      var filesToTrans;
      filesToTrans = [];
      angular.forEach($scope.files['TREE'], function(file, id) {
        if (file['checked'] === true) {
          return filesToTrans.push(id);
        }
      });
      if (filesToTrans.length === 0) {
        notify.info(gettext('Please select at least one file!'));
        return;
      }
      return $uibModalInstance.close({
        response: 'accept',
        files: filesToTrans,
        bulkMode: bulkMode
      });
    };
    $scope.saveBulk = function() {
      return $uibModalInstance.close({
        response: 'accept',
        files: 'All',
        bulkMode: bulkMode
      });
    };
    $scope.close = function() {
      return $uibModalInstance.dismiss();
    };
    $scope.share = function() {
      return $http.post('/api/lmn/session/trans-list-files', {
        user: senders[0]
      }).then(function(resp) {
        $scope.files = resp['data'][0];
        return $scope.filesList = resp['data'][1];
      });
    };
    $scope.collect = function() {
      if (bulkMode === 'false') {
        return $http.post('/api/lmn/session/trans-list-files', {
          user: senders,
          subfolderPath: receivers[0] + '_' + sessionComment
        }).then(function(resp) {
          $scope.files = resp['data'][0];
          return $scope.filesList = resp['data'][1];
        });
      }
    };
    $scope.createDir = function(path) {
      return $http.post('/api/lmn/create-dir', {
        filepath: path
      });
    };
    $scope.removeFile = function(file) {
      var path, role, school;
      role = $scope.identity.profile.sophomorixRole;
      school = $scope.identity.profile.activeSchool;
      path = $scope.identity.profile.homeDirectory + '\\transfer\\' + file;
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently the file ' + file + '?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.post('/api/lmn/smbclient/unlink', {
          path: path
        }).then(function(resp) {
          var pos;
          notify.success(gettext("File " + file + " removed"));
          delete $scope.files['TREE'][file];
          $scope.files['COUNT']['files'] = $scope.files['COUNT']['files'] - 1;
          pos = $scope.filesList.indexOf(file);
          return $scope.filesList.splice(pos, 1);
        });
      });
    };
    $scope.removeDir = function(file) {
      var path, role, school;
      role = $scope.identity.profile.sophomorixRole;
      school = $scope.identity.profile.activeSchool;
      path = '/srv/samba/schools/' + school + '/' + role + '/' + $scope.identity.user + '/transfer/' + file;
      return messagebox.show({
        text: gettext('Are you sure you want to delete permanently this directory and its content: ' + file + '?'),
        positive: gettext('Delete'),
        negative: gettext('Cancel')
      }).then(function() {
        return $http.post('/api/lmn/remove-dir', {
          filepath: path
        }).then(function(resp) {
          var pos;
          notify.success(gettext("Directory " + file + " removed"));
          delete $scope.files['TREE'][file];
          $scope.files['COUNT']['files'] = $scope.files['COUNT']['files'] - 1;
          pos = $scope.filesList.indexOf(file);
          return $scope.filesList.splice(pos, 1);
        });
      });
    };
    $scope.setTransferPath($scope.identity.user);
    if (action === 'share') {
      return $scope.share();
    } else {
      return $scope.collect();
    }
  });

}).call(this);

// Generated by CoffeeScript 2.5.1
(function() {
  angular.module('lmn.session_new').controller('LMNSessionsListController', function($scope, $http, $location, $route, $uibModal, gettext, notify, messagebox, pageTitle, lmFileEditor, lmEncodingMap, filesystem, validation, $rootScope, wait, lmnSession) {
    pageTitle.set(gettext('Sessions list'));
    $scope.startSchoolclassSessionMouseover = gettext('Start this session with all student in this schoolclass');
    $scope.generateRoomSessionMouseover = gettext('Start session containing all users in this room');
    $scope.loading = true;
    $http.get('/api/lmn/session/userInRoom').then(function(resp) {
      $scope.room = resp.data;
      return $scope.loading = false;
    });
    $scope.renameSession = function(session, e) {
      e.stopPropagation();
      return lmnSession.rename(session.sid, session.name).then(function(resp) {
        return session.name = resp;
      });
    };
    $scope.killSession = function(session, e) {
      e.stopPropagation();
      return lmnSession.kill(session.sid, session.name).then(function() {
        var position;
        position = $scope.sessions.indexOf(session);
        return $scope.sessions.splice(position, 1);
      });
    };
    $scope.newSession = function() {
      return lmnSession.new().then(function() {
        return $scope.getSessions();
      });
    };
    $scope.getSessions = function() {
      return lmnSession.load().then(function(resp) {
        $scope.schoolclasses = resp[0];
        $scope.projects = resp[1];
        return $scope.sessions = resp[2];
      });
    };
    $scope.start = function(session) {
      lmnSession.reset();
      return lmnSession.start(session);
    };
    $scope.startGenerated = function(group) {
      lmnSession.reset();
      if (group === 'this_room') {
        return $http.post("/api/lmn/session/userinfo", {
          users: $scope.room.usersList
        }).then(function(resp) {
          return lmnSession.startGenerated($scope.room.name, resp.data, 'room');
        });
      } else {
        // get participants from specified class or project
        return $http.post("/api/lmn/session/userinfo", {
          users: group.members
        }).then(function(resp) {
          return lmnSession.startGenerated(group.name, resp.data, group.type);
        });
      }
    };
    return $scope.$watch('identity.user', function() {
      if ($scope.identity.user === void 0) {
        return;
      }
      if ($scope.identity.user === null) {
        return;
      }
      if ($scope.identity.user === 'root') {
        return;
      }
      return $scope.getSessions();
    });
  });

}).call(this);

