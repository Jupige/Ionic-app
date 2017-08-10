import { PipeTransform, Pipe } from '@angular/core';
import { MakeMarketOrder, MarkertOrderItem } from "../model/make-market";

@Pipe({ name: 'orderItemValue', pure: false })
export class OrderItemValuePipe implements PipeTransform {
    transform(value: any, ...args: any[]) {
        //  console.log(value);
        // console.log(args);
        let cell = value[args[0]];
        if (!args || !cell)
            return value;

        return cell.currentValue;
    }
}

@Pipe({ name: 'orderItemClass', pure: false })
export class OrderItemClassPipe implements PipeTransform {
    transform(value: any, ...args: any[]) {
        if (value)
            return value.class;

        return null;
    }
}