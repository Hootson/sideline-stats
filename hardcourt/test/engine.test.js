import test from"node:test";import assert from"node:assert/strict";import{isThreePoint,derive}from"../engine.js";
test("corner and deep shots classify as three",()=>{assert.equal(isThreePoint(.82,.05,true),true);assert.equal(isThreePoint(.78,.5,true),false)});
test("derived score and plus minus follow made shot",()=>{const roster=[{id:"a"},{id:"b"}],events=[{type:"shot",payload:{playerId:"a",made:true,three:true,lineup:["a","b"]}}];const d=derive(events,roster);assert.equal(d.us,3);assert.equal(d.players.a.pts,3);assert.equal(d.players.b.plusMinus,3)});
