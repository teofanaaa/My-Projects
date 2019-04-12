import Router from 'koa-router';
import {ItemStore} from './ItemStore';
import {Item} from "./Item";
import {brodcast} from "../core/wsBroadcast";

const itemStore = new ItemStore({filename: './db/items.json'});

export const router = new Router();

// router.get('/item', async (ctx, next) => {
//     ctx.response.body = await itemStore.find({});
//     ctx.response.status = 200;
// });

router.get('/', async (ctx, next) => {
    const props = ctx.query;
    ctx.response.body = await itemStore.find({...props, userId: ctx.state.user._id});

    ctx.response.status = 200;
});

router.get('/:id', async (ctx, next) => {
    console.log(ctx.params.id);
    const res = await itemStore.find({_id: ctx.params.id});
    console.log(res);
    if (res.length === 0) {
        ctx.response.status = 404;
    } else {
        if (ctx.state.user._id !== res[0].userId){
            ctx.response.status = 403;
        }
        else {
            ctx.response.body = res[0];
            ctx.response.status = 200;
        }
    }
});

router.post('/', async (ctx, next) => {
    const userId = ctx.state.user._id;
    const item = await itemStore.insert({...ctx.request.body, userId, version: 1});
    ctx.response.body = item;
    ctx.response.status = 200;
    console.log(item);
    brodcast({event: 'created', payload: item});
});

router.put('/:id', async (ctx, next) => {
    const props = ctx.request.body;
    const id = ctx.params.id;
    const version =  props.version;
    const oldItem = await itemStore.find({_id: id});
    if (oldItem.length === 0){
        ctx.response.status = 404; //not found
        return;
    }
    if (oldItem[0].version > version){
        ctx.response.status = 409; //conflict
        ctx.body.response = oldItem[0];
        return;
    }
    props.version += 1;
    const count = await itemStore.update({_id: id,  userId: ctx.state.user._id}, props);
    const newItem = await itemStore.find({_id: id,  userId: ctx.state.user._id});
    ctx.response.body = "UPDATED: " + count;
    ctx.response.status = 200;
    brodcast({event: 'updated', payload: {_id, ...props}});
});

router.delete('/:id', async (ctx, next) => {
    const props = {_id: ctx.params.id};
    const count = await itemStore.remove(props);
    ctx.response.body = "DELETED: " + count;
    ctx.response.status = 200;
    brodcast({event: 'deleted', payload: props});
});
