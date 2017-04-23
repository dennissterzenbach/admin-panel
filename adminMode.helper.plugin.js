var configServices = [
    'mainConfig',
    'i18nSource',
    'uiContainer',
    'uiService',
    'endpointSearchresult',
    'endpointSearchresultcount',
    'endpointSearchsuggest',
    'endpointVehicle',
    'endpointCMSContent',
    'endpointMarketingTeaser'
];

var detectionHelper = new DetectionHelper();

function AdminPanel(panelGenerator, keyboardHelper, storageHelper) {
    this.panelGenerator = panelGenerator;
    this.keyboardHelper = keyboardHelper;
    this.storageHelper = storageHelper;
}

AdminPanel.prototype.getPanelGenerator = getPanelGenerator;
AdminPanel.prototype.init = initAdminPanel;
AdminPanel.prototype.toggle = toggle;
AdminPanel.prototype.createAdminPanel = createAdminPanel;
AdminPanel.prototype.toggleAdminPanel = toggleAdminPanel;
AdminPanel.prototype.removeAdminPanel = removeAdminPanel;

function initAdminPanel() {
    if (window.location && window.location.search && window.location.search.indexOf('adminMode') !== -1) {
        this.keyboardHelper.initKeyboardShortcut(this);
    }
}

function getPanelGenerator() {
    return this.panelGenerator;
}

function AdminPanelGenerator() {
}
AdminPanelGenerator.prototype.createPanelHTML = createPanelHTML;
AdminPanelGenerator.prototype.loadExternalJavaScriptIntoPage = loadExternalJavaScriptIntoPage;

function AdminPanelKeyboardHelper() {
}
AdminPanelKeyboardHelper.prototype.initKeyboardShortcut = initKeyboardShortcut;

function AdminPanelStorageHelper(localStorageDBName) {
    this.dbName = localStorageDBName;
}

AdminPanelStorageHelper.prototype.getOverridesFromStorage = getOverridesFromStorage;
AdminPanelStorageHelper.prototype.updateOverrides = updateOverrides;

window.adminPanel = new AdminPanel(new AdminPanelGenerator(), new AdminPanelKeyboardHelper(), new AdminPanelStorageHelper('myAdminPanelOverrides'));
window.adminPanel.init();

////////////////////////////////////////////////////////////////////////////////////////////////////
// API : KEYBOARD HELPER

function initKeyboardShortcut(panel) {
    panel.getPanelGenerator().loadExternalJavaScriptIntoPage('shortcut.js', _initKeyboardShortcut.bind(panel));

    function _initKeyboardShortcut() {
        window.shortcut.add("Ctrl+Shift+Alt+A", this.toggle.bind(this, window.appContext, configServices), {
            'type': 'keydown',
            'propagate': true,
            'target': document
        });
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// API : HTML generating and manipulating

function loadExternalJavaScriptIntoPage(url, onLoadCallbackFn) {
    var scriptElement;

    var voidFn = function() {};

    scriptElement = document.createElement("script");
    scriptElement.type = "text/javascript";
    scriptElement.src = url;
    scriptElement.onload = onLoadCallbackFn ? onLoadCallbackFn : voidFn;

    document.body.appendChild(scriptElement);
}

function createPanelHTML(appContextObject, services, eventHandlers) {
    var adminPanel = document.createDocumentFragment();
    var main = createHTMLElement('div', undefined, 'adminpanel');
    main.id = 'adminpanel';

    var table = createHTMLElement('table');
    var tableArea = createHTMLElement('thead');
    var row = createHTMLElement('tr');

    var headlines = [
        'Service',
        'DataSource',
        'Process'
    ];
    
    for (var i in headlines) {
        row.appendChild(createCell(headlines[i]));
    }

    tableArea.appendChild(row);
    table.appendChild(tableArea);

    tableArea = createHTMLElement('tbody');
    addData.call(this, tableArea, appContextObject, services, eventHandlers);

    table.appendChild(tableArea);
    main.appendChild(table);
    adminPanel.appendChild(main);

    return adminPanel;

    function createCell(text) {
        return createHTMLElement('th', text);
    }

    function addData(moduleList, appContextObject, services, eventHandlers) {
        var overridenConfig = {};

        var item;
        var itemRow;
        var svcName;
        var dataAttrib;

        for (var svcId in services) {
            svcName = services[svcId];
            itemRow = createHTMLElement('tr');

            item = createHTMLElement('td', svcName);
            itemRow.appendChild(item);

            overridenConfig = getContextSetup.call(this, appContextObject, svcName);

            item = createHTMLElement('td', overridenConfig.dataSource, 'adminMode-helper--changeable');
            
            dataAttrib = document.createAttribute('data-admin-mode-servicename');
            dataAttrib.value = svcName;
            item.setAttributeNode(dataAttrib);

            addEventHandler(item, 'click', eventHandlers.click);
            itemRow.appendChild(item);

            item = createHTMLElement('td', overridenConfig.process);
            // addEventHandler(item, 'click', SwitchProcess);

            itemRow.appendChild(item);

            moduleList.appendChild(itemRow);
        }

        function getContextSetup(appContextObject, service) {
            var dataSource = appContextObject._source.toLowerCase();
            var processId = appContextObject._process;

            var overridenConfig = this.storageHelper.getOverridesFromStorage();
            if (detectionHelper.isObject(overridenConfig)) {
                dataSource = detectionHelper.isObject(overridenConfig[service]) && detectionHelper.isDefined(overridenConfig[service].source) ? overridenConfig[service].source : dataSource;
                processId = detectionHelper.isObject(overridenConfig[service]) && detectionHelper.isDefined(overridenConfig[service].process) ? overridenConfig[service].process : appContextObject._process;
            }

            return {
                dataSource: dataSource,
                process: processId
            }
        }
    }

    function addEventHandler(item, event, handler) {
        if (item && event && handler) {
            item.addEventListener(event, handler);
        }
    }

    function createHTMLElement(tagName, innerText, className) {
        var element = document.createElement(tagName);

        if (innerText) {
            element.appendChild(document.createTextNode(innerText));
        }

        if (className) {
            element.className = className;
        }

        return element;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// API

function toggle(appContext, services) {
    this.toggleAdminPanel(appContext, services);
}

function toggleAdminPanel(appContextObject, services) {
    if (document.querySelector('#adminpanel')) {
        return this.removeAdminPanel();
    }

    this.createAdminPanel(appContextObject, services);
}

function createAdminPanel(appContextObject, services) {
    if (document.querySelector('#adminpanel')) {
        removeAdminPanel();
        return;
    }

    if (!document.querySelector('head>link[data-admin-mode-css]')) {
        loadCSS('');
    }

    var adminPanel = this.panelGenerator.createPanelHTML.call(this, appContextObject, services, {
        click: SwitchDataSource(this)
    });

    function updateOverrides(serviceName, settingName, dataSourceValue, processValue) {
        return this.storageHelper.updateOverrides(serviceName, settingName, dataSourceValue, processValue);
    }

    function SwitchDataSource(panel) {
        return function() {
            var newValue;
            var processValue;

            processValue = patchedProcess($(this).nextAll(':last').text());

            if ($(this).text() === 'json') {
                newValue = null;
            } else {
                newValue = 'json';
            }

            $(this).text(newValue || 'original');
            $(this).nextAll(':last').text(processValue || window.appContext._process);

            updateOverrides.call(panel, $(this).prevAll(':first').text(), 'source', newValue, processValue);
        };
    }
    
    function patchedProcess(process) {
        var newValue = '';

        if (process.indexOf('_override') !== -1) {
            newValue = window.appContext._process;
        } else {
            newValue = window.appContext._process.substr(0, 2) + '_override';
        }

        return newValue;
    }

    document.body.appendChild(adminPanel);
}

function removeAdminPanel() {
    document.querySelector('#adminpanel').remove();
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// API : STORAGE HELPER

function getOverridesFromStorage() {
    return JSON.parse(window.localStorage.getItem(this.dbName));
}

function updateOverrides(serviceName, settingName, dataSourceValue, processValue) {
    var overridenConfig = this.getOverridesFromStorage();

    if (detectionHelper.isUndefined(overridenConfig) || overridenConfig === null) {
        overridenConfig = {};
    }

    // remove from overrides:
    if (dataSourceValue === null) {
        delete overridenConfig[serviceName];
    } else {

        // add to overrides if missing
        if (!overridenConfig[serviceName]) {
            overridenConfig[serviceName] = {
                source: '',
                process: '',
            }
        }

        // set correct override values
        overridenConfig[serviceName].source = dataSourceValue;
        overridenConfig[serviceName].process = processValue;
    }

    window.localStorage.setItem(this.dbName, JSON.stringify(overridenConfig));
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// HELPER FUNCTIONS

function loadCSS(baseURL) {
    var CSSPrefixURL = baseURL || '';

    if (CSSPrefixURL.substr(-1) !== '/') {
        CSSPrefixURL += '/';
    }

    var adminModeCSSFileName = 'adminMode.css';
    var adminModeCSSFullURL = CSSPrefixURL + adminModeCSSFileName;

    var style = document.createElement('link');
    style.rel = "stylesheet";
    style.type = "text/css";
    style.href = adminModeCSSFullURL;

    // this attribute enables us to uniquely and safely identify our CSS link
    // and avoid adding it more than once
    var dataAttrib = document.createAttribute('data-admin-mode-css');
    dataAttrib.value = '';
    style.setAttributeNode(dataAttrib);
    
    document.querySelector('head').appendChild(style);
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// DETECTION HELPER

function DetectionHelper() {

}

DetectionHelper.prototype.isObject = function isObject(arg) {
    return (typeof arg === 'object') && (arg !== null);
};

DetectionHelper.prototype.isUndefined = function isUndefined(arg) {
    return (typeof arg === 'undefined');
};

DetectionHelper.prototype.isDefined = function isDefined(arg) {
    return !this.isUndefined(arg);
};
