'use strict';

let Options = {};
let gConfig = null;

let kReloadText = {
  en: 'To apply configuration changes, reload cactbot overlays.',
};

let kReloadButtonText = {
  en: 'Reload',
};

class CactbotConfigurator {
  constructor(configFiles, configOptions, savedConfig) {
    // Predefined, only for ordering purposes.
    this.contents = {
      // top level
      'cactbot': [],

      // things most people care about
      'raidboss': [],
      'jobs': [],
    };
    this.configOptions = configOptions;
    this.lang = configOptions.Language || 'en';
    this.savedConfig = savedConfig || {};
    this.developerOptions = this.getOption('cactbot', 'ShowDeveloperOptions', false);

    for (let filename in configFiles) {
      try {
        eval(configFiles[filename]);
      } catch (exception) {
        console.error('Error parsing JSON from ' + filename + ': ' + exception);
        continue;
      }
    }

    let templates = UserConfig.optionTemplates;
    for (let group in templates) {
      this.contents[group] = this.contents[group] || [];
      this.contents[group].push(templates[group]);
    }

    this.buildButterBar();

    let container = document.getElementById('container');
    this.buildUI(container, this.contents);
  }

  async saveConfigData() {
    // TODO: rate limit this?
    await callOverlayHandler({
      call: 'cactbotSaveData',
      overlay: 'options',
      data: this.savedConfig,
    });

    document.getElementById('butter-margin').classList.remove('hidden');
  }

  buildButterBar() {
    let container = document.getElementById('butter-bar');

    let textDiv = document.createElement('div');
    textDiv.classList.add('reload-text');
    textDiv.innerText = this.translate(kReloadText);
    container.appendChild(textDiv);

    let buttonInput = document.createElement('input');
    buttonInput.classList.add('reload-button');
    buttonInput.type = 'button';
    buttonInput.onclick = () => {
      callOverlayHandler({ call: 'cactbotReloadOverlays' });
    };
    buttonInput.value = this.translate(kReloadButtonText);
    container.appendChild(buttonInput);
  }

  buildOverlayGroup(container, group) {
    let collapser = document.createElement('div');
    collapser.classList.add('overlay-container');
    container.appendChild(collapser);

    let a = document.createElement('a');
    a.name = group;
    collapser.appendChild(a);

    let header = document.createElement('div');
    header.classList.add('overlay-header');
    header.innerText = group;
    a.appendChild(header);

    let groupDiv = document.createElement('div');
    groupDiv.classList.add('overlay-options');
    collapser.appendChild(groupDiv);

    a.onclick = (e) => {
      a.parentNode.classList.toggle('collapsed');
    };

    return groupDiv;
  }

  buildUI(container, contents) {
    for (let group in contents) {
      let content = contents[group];
      if (content.length == 0)
        continue;

      // For each overlay options template, build a section for it.
      // Then iterate through all of its options and build ui for those options.
      // Give each options template a chance to build special ui.
      let groupDiv = this.buildOverlayGroup(container, group);
      for (let i = 0; i < content.length; ++i) {
        let options = content[i].options || [];
        for (let j = 0; j < options.length; ++j) {
          let opt = options[j];
          if (!this.developerOptions && opt.debugOnly)
            continue;
          let buildFunc = {
            checkbox: this.buildCheckbox,
            select: this.buildSelect,
            float: this.buildFloat,
            integer: this.buildInteger,
            directory: this.buildDirectory,
          }[opt.type];
          if (!buildFunc) {
            console.error('unknown type: ' + JSON.stringify(opt));
            continue;
          }

          buildFunc.bind(this)(groupDiv, opt, group);
        }

        let builder = content[i].buildExtraUI;
        if (builder)
          builder(this, groupDiv);
      }
    }
  }

  translate(textObj) {
    if (textObj === null || typeof textObj !== 'object' || !textObj['en'])
      return textObj;
    let t = textObj[this.lang];
    if (t)
      return t;
    return textObj['en'];
  }

  buildNameDiv(opt) {
    let div = document.createElement('div');
    div.innerHTML = this.translate(opt.name);
    return div;
  }

  // takes variable args, with the last value being the default value if
  // any key is missing.
  // e.g. (foo, bar, baz, 5) with {foo: { bar: { baz: 3 } } } will return
  // the value 3.  Requires at least two args.
  getOption() {
    let num = arguments.length;
    if (num < 2) {
      console.error('getOption requires at least two args');
      return;
    }

    let defaultValue = arguments[num - 1];
    let objOrValue = this.savedConfig;
    for (let i = 0; i < num - 1; ++i) {
      objOrValue = objOrValue[arguments[i]];
      if (typeof objOrValue === 'undefined')
        return defaultValue;
    }

    return objOrValue;
  }

  // takes variable args, with the last value being the 'value' to set it to
  // e.g. (foo, bar, baz, 3) will set {foo: { bar: { baz: 3 } } }.
  // requires at least two args.
  setOption() {
    let num = arguments.length;
    if (num < 2) {
      console.error('setOption requires at least two args');
      return;
    }

    // Set keys and create default {} if it doesn't exist.
    let obj = this.savedConfig;
    for (let i = 0; i < num - 2; ++i) {
      let arg = arguments[i];
      obj[arg] = obj[arg] || {};
      obj = obj[arg];
    }
    // Set the last key to have the final argument's value.
    obj[arguments[num - 2]] = arguments[num - 1];
    console.log(JSON.stringify(this.savedConfig));
    this.saveConfigData();
  }

  buildCheckbox(parent, opt, group) {
    let div = document.createElement('div');
    let input = document.createElement('input');
    div.appendChild(input);
    input.type = 'checkbox';
    input.checked = this.getOption(group, opt.id, opt.default);
    input.onchange = () => this.setOption(group, opt.id, input.checked);

    parent.appendChild(this.buildNameDiv(opt));
    parent.appendChild(div);
  }

  buildSelect(parent, opt, group) {
    let div = document.createElement('div');
    let input = document.createElement('select');
    div.appendChild(input);

    let defaultValue = this.getOption(group, opt.id, opt.default);
    input.onchange = () => this.setOption(group, opt.id, input.value);

    let innerOptions = this.translate(opt.options);
    for (let key in innerOptions) {
      let elem = document.createElement('option');
      elem.value = innerOptions[key];
      elem.innerHTML = key;
      if (innerOptions[key] == defaultValue)
        elem.selected = true;
      input.appendChild(elem);
    }

    parent.appendChild(this.buildNameDiv(opt));
    parent.appendChild(div);
  }

  buildFloat(parent, opt, group) {
    let div = document.createElement('div');
    let input = document.createElement('input');
    div.appendChild(input);
    input.type = 'text';
    input.step = 'any';
    input.value = this.getOption(group, opt.id, opt.default);
    let setFunc = () => this.setOption(group, opt.id, input.value);
    input.onchange = setFunc;
    input.oninput = setFunc;

    parent.appendChild(this.buildNameDiv(opt));
    parent.appendChild(div);
  }

  buildInteger(parent, opt, group) {
    let div = document.createElement('div');
    let input = document.createElement('input');
    div.appendChild(input);
    input.type = 'text';
    input.step = 1;
    input.value = this.getOption(group, opt.id, opt.default);
    let setFunc = () => this.setOption(group, opt.id, input.value);
    input.onchange = setFunc;
    input.oninput = setFunc;

    parent.appendChild(this.buildNameDiv(opt));
    parent.appendChild(div);
  }
}

UserConfig.getUserConfigLocation('config', async function(e) {
  let readConfigFiles = callOverlayHandler({
    call: 'cactbotReadDataFiles',
    source: location.href,
  });

  let configDataFiles = (await readConfigFiles).detail.files;

  gConfig = new CactbotConfigurator(
      configDataFiles,
      Options,
      UserConfig.savedConfig);
});
