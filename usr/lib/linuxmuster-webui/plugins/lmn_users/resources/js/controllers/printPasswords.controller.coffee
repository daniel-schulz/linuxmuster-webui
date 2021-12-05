angular.module('lm.users').config ($routeProvider) ->
    $routeProvider.when '/view/lm/users/print-passwords',
        controller: 'LMUsersPrintPasswordsController'
        templateUrl: '/lmn_users:resources/partial/print-passwords.html'


angular.module('lm.users').controller 'LMUsersPrintPasswordsOptionsModalController', ($scope, $uibModalInstance, $http, notify, messagebox, gettext, schoolclass, classes, user) ->
    $scope.options = {
        format: 'pdf'
        one_per_page: false
        pdflatex: false
        schoolclass: schoolclass
        user: user
    }
    if $scope.options.user is 'root'
        $scope.options.user = 'global-admin'

    $scope.title = if schoolclass != '' then gettext("Class") + ": #{schoolclass}" else gettext('All users')

    $scope.print = () ->
        msg = messagebox.show(progress: true)
        $http.post('/api/lm/users/print', $scope.options).then (resp) ->
            if resp.data == 'success'
                notify.success(gettext("Created password pdf"))
                location.href = "/api/lm/users/print-download/#{if schoolclass != '' then schoolclass else 'add'}-#{$scope.options.user}.#{if $scope.options.format == 'pdf' then 'pdf' else 'csv'}"
            else
                notify.error(gettext("Could not create password pdf"))
            $uibModalInstance.close()
        .finally () ->
            msg.close()

    $scope.cancel = () ->
        $uibModalInstance.dismiss()


angular.module('lm.users').controller 'LMUsersPrintPasswordsController', ($scope, $http, $location, $route, $uibModal, gettext, notify, messagebox, pageTitle, lmFileEditor) ->
    pageTitle.set(gettext('Print Passwords'))

    $scope.select = (schoolclass,user) ->
        $uibModal.open(
            templateUrl: '/lmn_users:resources/partial/print-passwords.options.modal.html'
            controller: 'LMUsersPrintPasswordsOptionsModalController'
            resolve:
                schoolclass: () -> schoolclass
                classes: () -> $scope.classes
                user: () -> user
        )

    $scope.filterGroupType = (val) ->
        return (dict) ->
            dict['type'] == val

    $scope.filterGroupMembership = (val) ->
        return (dict) ->
            dict['membership'] == val

    $scope.getGroups = (username) ->
        if $scope.identity.user == 'root' || $scope.identity.profile.sophomorixAdminClass.includes('admins')
          $http.get('/api/lm/users/print').then (resp) ->
            $scope.classes = resp.data
        else
          $http.post('/api/lmn/groupmembership', {action: 'list-groups', username: username, profil: $scope.identity.profile}).then (resp) ->
              $scope.groups = resp.data[0]
              $scope.userclasses = $scope.groups.filter($scope.filterGroupType('schoolclass'))
              $scope.userclasses = $scope.userclasses.filter($scope.filterGroupMembership(true))
              $scope.classes = []
              for item in $scope.userclasses
                  $scope.classes.push(item.groupname)

    $scope.$watch 'identity.user', ->
        if $scope.identity.user is undefined
            return
        if $scope.identity.user is null
            return
        if $scope.identity.user is 'root'
            return

        $scope.getGroups($scope.identity.user)
        return
