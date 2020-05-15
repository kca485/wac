'use strict';

var ENTER_KEY = 13;
var ESCAPE_KEY = 27;

var util = {
  uuid: function() {
    var i, random;
    var uuid = '';

    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) {
        uuid += '-';
      }
      uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }

    return uuid;
  },
  whichLiElement: function(dataId) {
    var selectorString = 'li[data-id="' + dataId + '"]';
    return document.querySelector(selectorString);
  },
  whichArray: function(liDataId, array) {

    // the nested todos is stored as a nested array.
    // this method is to pick which specific array.

    for (var i = 0; i < array.length; i++) {
      if (array[i].id === liDataId) {
        return array;
      } else if (array[i].children.length > 0) {
        var recurse = this.whichArray(liDataId, array[i].children);
        if (recurse) {
          return recurse;
        }
      }
    }
  },
  whichArrayElement: function(e) {

    // an entry in the todo list is stored as an array element.
    // this method is to find that element of an array.

    var targetLi = e.target.closest('li');
    var todoArray = this.whichArray(targetLi.getAttribute('data-id'), App.todos);
    var position = this.indexFromEl(targetLi);

    return todoArray[position];
  },
  indexFromEl: function(el) {

    // to find the index of a list in a specific array

    var currentLi = el.closest('li');
    var id = currentLi.getAttribute('data-id');

    var todos = this.whichArray(id, App.todos);
    var i = todos.length;

    while (i--) {
      if (todos[i].id === id) {
        return i;
      }
    }
  }
};

var App = {
  init: function() {
    var store = localStorage.getItem('todos');
    this.todos = JSON.parse(store) || [];
    
    this.bindEvents();

    this.render();
  },

  loadState: function() {
    localStorage.setItem('todos', JSON.stringify(this.todos));

    // the .toggleAll() method works based on the input#toggle-all checkbox
    var activeTodos = this.todos.filter(function(todo) {
      return !todo.completed;
    });
    document.getElementById('toggle-all').checked = activeTodos.length === 0;

    this.render();

    document.getElementById('new-todo').focus();
  },

  bindEvents: function() {
    document.getElementById('new-todo').addEventListener('keyup', this.create.bind(this));
    document.getElementById('toggle-all-button').addEventListener('click', this.toggleAll.bind(this));
    document.getElementById('clear-completed').addEventListener('click', function() {
      this.destroyCompleted();
      // Render outside/after destroyCompleted.
      // If rendered inside (like some other methods here), the recursion in descroyCompleted 
      // could cause trouble for a complex todolist structure.
      this.loadState();
    }.bind(this));

    var uls = document.querySelectorAll('ul');
    uls.forEach(function(ul) {

      // event delegation

      ul.addEventListener('change', function(event) {
        if (event.target.className === 'toggle') {
          App.toggle(event);
        }
      });
      ul.addEventListener('dblclick', function(event) {
        if (event.target.localName === 'label') {
          App.editMode(event);
        }
      });
      ul.addEventListener('keyup', function(event) {
        if (event.target.className === 'edit') {
          App.editKeyup(event);
        }
      });
      ul.addEventListener('focusout', function(event) {
        if (event.target.className === 'edit') {
          App.editUpdate(event);
        }
      });
      ul.addEventListener('click', function(event) {
        if (event.target.className === 'destroy') {
          App.destroy(event);
        }
      });
      ul.addEventListener('click', function(event) {
        if (event.target.className === 'add-child') {
          App.addingChild(event);
        }
      });
      ul.addEventListener('click', function(event) {
        if (event.target.className === 'expand') {
          App.expandTodos(event);
        }
      });
      ul.addEventListener('click', function(event) {
        if (event.target.className === 'hide') {
          App.hideTodos(event);
        }
      });
    });
  },

  render: function(list, ulElement) {

    // will first be invoked without arguments
    // to start rendering from the top level todos
    if (list === undefined) {
      list = this.todos;
      ulElement = document.getElementById('top-ul');
    }

    ulElement.innerHTML = '';
    for (var i = 0; i < list.length; i++) { 
  
      // li
      var li = document.createElement('li');
      if (list[i].completed === true) {
        li.classList.add('completed');
      }
      li.dataset.id = list[i].id;			
  
      // div.view
      var div = document.createElement('div');
      div.classList.add('view');

      // input.toggle
      var toggleInput = document.createElement('input');
      toggleInput.setAttribute('type', 'checkbox');
      toggleInput.classList.add('toggle');
      toggleInput.checked = list[i].completed;;
  
      // label
      var label = document.createElement('label');
      label.textContent = list[i].title;
  
      // button.destroy
      var destroyButton = document.createElement('button');
      destroyButton.textContent = 'clear';
      destroyButton.classList.add('destroy');
  
      // button.add-child
      var addChildButton = document.createElement('button');
      addChildButton.textContent = 'add child';
      addChildButton.classList.add('add-child');

      // button.expand
      var expandButton = document.createElement('button');
      expandButton.textContent = 'expand';
      expandButton.classList.add('expand');

      // button.hide
      var hideButton = document.createElement('button');
      hideButton.textContent = 'hide';
      hideButton.classList.add('hide')
  
      // input.edit
      var editInput = document.createElement('input');
      editInput.setAttribute('type', 'text');
      editInput.classList.add('edit');
      editInput.setAttribute('value', list[i].title);
  
      // the ul HTML structure
      ulElement.appendChild(li);
      li.appendChild(div);
      div.appendChild(toggleInput);
      div.appendChild(destroyButton);
      div.appendChild(addChildButton);
      if (list[i].children.length > 0) {
        list[i].expanded ? div.appendChild(hideButton) : div.appendChild(expandButton);
      }
      div.appendChild(label);
      div.appendChild(editInput);
  
      // recursively render the nested todos,
      // also, only render the children that are expanded
      if ((list[i].children.length > 0) && list[i].expanded) {
        var childUl = document.createElement('ul');
        childUl.classList.add('todo-list');
        li.appendChild(childUl);
        this.render(list[i].children, childUl);
      }
    }
  },

  toggleAll: function(e) {
    var toggleAllCheckbox = document.getElementById('toggle-all');
    toggleAllCheckbox.checked = !toggleAllCheckbox.checked;

    var isChecked = toggleAllCheckbox.checked;

    this.todos.forEach(function(todo) {
      todo.completed = isChecked;
      this.trickleDownChecked(todo);
    }.bind(this));

    this.loadState();
  },
  toggle: function(e) {
    var li = util.whichArrayElement(e);
    li.completed = !li.completed;

    if (li.completed) {
      this.trickleDownChecked(li);
    } else {
      this.parentUnchecked();
    }

    this.loadState();
  },
  trickleDownChecked: function(li) {

    // if a parent 'li' is completed, all the children should be completed
    if (li.children.length > 0) {
      for (var i = 0; i < li.children.length; i++) {
        li.children[i].completed = li.completed;
        this.trickleDownChecked(li.children[i]);
      }
    }
  },
  parentUnchecked: function(todos) {
    
    // parentUnchecked will first be executed with no argument.
    // without argument, start looking from the top parent todos
    if (!todos) {
      todos = this.todos;
    }

    for (var i = 0; i < todos.length; i++) {

      // we only care about the todo that has any children
      if (todos[i].children.length > 0) {
        var childrenArray = todos[i].children;

        this.parentUnchecked(childrenArray);

        // if any of the children is not completed, the parent should not be completed
        for (var j = 0; j < childrenArray.length; j++) {
          if (!childrenArray[j].completed) {
            todos[i].completed = false;
          }
        }
      }
    }
  },

  create: function(e) {
    var input = e.target;
    var val = input.value.trim();

    if (e.which !== ENTER_KEY || !val) {
      return;
    }

    this.todos.push({
      id: util.uuid(),
      title: val,
      completed: false,
      children: [],
      expanded: true
    });

    input.value = '';

    this.loadState();
  },
  addingChild: function(e) {
    var target = util.whichArrayElement(e);

    target.children.push({
      id: util.uuid(),
      title: '',
      completed: false,
      children: [],
      expanded: true
    });

    this.loadState();

    // the child was created with an empty title, so it needs to be added
    this.editMode(e);
  },

  editMode: function(e) {

    // if entering .editMode from .addingChild method,
    // we are editing the the newly created li element
    if (e.type === 'click') {
      var target = util.whichArrayElement(e);
      var newlyAddedIndex = target.children.length - 1;
      var newData = target.children[newlyAddedIndex];
      
      var li = util.whichLiElement(newData.id);
      
      li.dataset.newlyCreated = 'true'; // used by .editUpdate()
    
    // if entering editMode from double-clicking a todo,
    // we are editing the li which was double-clicked
    } else {
      var li = e.target.closest('li');
    }

    var input = li.querySelector('.edit');

    // to hide the label element and show the input textbox
    li.classList.add('editing');

    input.focus();
  },
  editKeyup: function(e) {
    if (e.which === ENTER_KEY) {
      e.target.blur();
    }

    if (e.which === ESCAPE_KEY) {
      e.target.dataset.abort = 'true'; // used by .editUpdate()
      e.target.blur();
    }
  },
  editUpdate: function(e) {
    var inputEl = e.target;
    var val = inputEl.value.trim();

    var liData = util.whichArrayElement(e);
    if (inputEl.dataset.abort) {
      inputEl.dataset.abort = false;
    } else {
      liData.title = val;
    }

    // if it's a newly added child, execute .parentUnchecked
    var liElement = util.whichLiElement(liData.id);
    if (liData.title && liElement.dataset.newlyCreated) {
      this.parentUnchecked();
      delete liElement.dataset.newlyCreated;
    }

    if (!liData.title) {
      this.destroy(e);
    }

    this.loadState();
  },

  destroy: function(e) {
    var targetLi = e.target.closest('li');
    var todoArray = util.whichArray(targetLi.getAttribute('data-id'), this.todos);
    
    todoArray.splice(util.indexFromEl(e.target), 1);

    this.loadState();
  },
  destroyCompleted: function(todosParent) {
    if (!todosParent) {
      todosParent = this.todos;
    }

    var deletedSum = 0;
  
    // mark for deletion
    for (var i = 0; i < todosParent.length; i++) {
      if (todosParent[i].completed) {
        todosParent[i] = 'deleted';
        deletedSum++;
      } else {
        if (todosParent[i].children.length > 0) {
          this.destroyCompleted(todosParent[i].children);
        }
      }
    }

    // to avoid holes in the array,
    // shift all the marked to the end of the array, then delete them
    todosParent.sort(function(a, b) {
      if (a === 'deleted') return 1;
      if (b === 'deleted') return -1;
      if (a === b) return 0;
    });
    for (var i = 0; i < deletedSum; i++) {
      todosParent.pop();
    }
  },

  expandTodos: function(e) {
    var li = util.whichArrayElement(e);
    li.expanded = true;

    this.loadState();
  },
  hideTodos: function(e) {
    var li = util.whichArrayElement(e);
    li.expanded = false;

    this.loadState();
  }
};

App.init();