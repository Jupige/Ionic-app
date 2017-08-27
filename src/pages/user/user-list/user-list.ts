
import { Component, OnInit, ChangeDetectorRef, ElementRef, OnDestroy, Optional, Host, ForwardRefFn, forwardRef, SkipSelf } from '@angular/core';
import { NavController } from 'ionic-angular';

import { Container } from "golden-layout";
import { GoldenLayoutService } from "../../../app/golden-layout.service";
import { GoldenLayoutComponent } from "../../../app/golden.base";

@Component({
    selector: 'user-list',
    templateUrl: './user-list.html'
})
export class UserListPage {

    

    selectedUser: any = {};

    users = [
        { name: 'Jackson Turner', street: '217 Tawny End', img: 'men_1.jpg' },
        { name: 'Megan Perry', street: '77 Burning Ramp', img: 'women_1.jpg' },
        { name: 'Ryan Harris', street: '12 Hazy Apple Route', img: 'men_2.jpg' },
        { name: 'Jennifer Edwards', street: '33 Maple Drive', img: 'women_2.jpg' },
        { name: 'Noah Jenkins', street: '423 Indian Pond Cape', img: 'men_3.jpg' }
    ];

    constructor(
        public navCtrl: NavController,
        layouSev: GoldenLayoutService,
        private cd: ChangeDetectorRef,
        ele: ElementRef,
        @SkipSelf() parent: ElementRef) {
        console.log(`${this.constructor.name} constructor`);
    }


    select(user) {
        // this.selectedUser.isSelected = false;
        // user.isSelected = true;
        // this.selectedUser = user;
        // this.container.extendState({ selectedUserIndex: this.users.indexOf(user) });
        // this.container.layoutManager.eventHub.emit('userSelected', user);
    };

}

